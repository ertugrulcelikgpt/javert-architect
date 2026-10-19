/**
 * JAVERT Architect — puanlama ve saldırı simülasyonu motoru.
 *
 * DOM'a bağımlı değildir; tarayıcıda window.JavertEngine olarak,
 * Node.js'te require('./engine.js') ile kullanılır (birim testleri için).
 *
 * Puan dağılımı (toplam 100):
 *   Kapsam  60 — zorunlu katmanların ne kadarı yerleştirildi
 *   Sıra    25 — zorunlu katmanlar ideal sıraya ne kadar uyuyor (LCS)
 *   Bonus   15 — savunmayı derinleştiren ek katmanlar
 *   Ceza       — gereksiz katman, bütçe aşımı, kullanılan ipucu
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JavertEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WEIGHTS = { coverage: 60, order: 25, bonus: 15 };
  const PENALTY = { irrelevant: 5, perBudgetUnit: 2, maxBudget: 20, hint: 5 };
  const BONUS_CAP = 3;
  const BUDGET_SLACK = 4;

  /** En uzun ortak alt dizi uzunluğu. */
  function lcs(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  function costOf(ids, layersById) {
    return ids.reduce((sum, id) => sum + (layersById[id] ? layersById[id].cost : 0), 0);
  }

  function budgetFor(scenario, layersById) {
    if (typeof scenario.budget === 'number') return scenario.budget;
    return costOf(scenario.ideal, layersById) + (scenario.budgetSlack ?? BUDGET_SLACK);
  }

  function gradeFor(score) {
    if (score >= 85) return { key: 'excellent', label: 'MÜKEMMEL' };
    if (score >= 60) return { key: 'good', label: 'İYİ' };
    if (score >= 40) return { key: 'fair', label: 'GELİŞTİRİLMELİ' };
    return { key: 'poor', label: 'YENİDEN DENE' };
  }

  function names(ids, layersById) {
    return ids.map((id) => (layersById[id] ? layersById[id].name : id));
  }

  /**
   * Saldırı zincirini yerleştirilen katmanlara karşı oynatır.
   * Her aşama, karşı önlemlerinden en az biri mimaride varsa engellenir.
   */
  function simulate(scenario, placed) {
    const set = new Set(placed);
    const stages = scenario.killChain.map((step) => {
      const blockedBy = step.counters.filter((id) => set.has(id));
      return { ...step, blockedBy, blocked: blockedBy.length > 0 };
    });

    const prevent = stages.filter((s) => s.phase === 'prevent');
    const recover = stages.filter((s) => s.phase === 'recover');
    const firstBlock = prevent.findIndex((s) => s.blocked);

    let outcome;
    if (firstBlock !== -1) outcome = 'stopped';
    else if (recover.some((s) => s.blocked)) outcome = 'contained';
    else outcome = 'breach';

    return {
      stages,
      outcome,
      stoppedAt: firstBlock !== -1 ? prevent[firstBlock] : null,
      blockedCount: stages.filter((s) => s.blocked).length,
      // Kaç önleme aşaması bağımsız olarak kesiliyor — derinlik göstergesi
      depth: prevent.filter((s) => s.blocked).length,
      preventTotal: prevent.length,
    };
  }

  /**
   * Bir mimariyi değerlendirir.
   * @param {object} scenario
   * @param {string[]} placed      kaynaktan hedefe sıralı katman id'leri
   * @param {object} layersById
   * @param {{hintsUsed?: number}} [opts]
   */
  function evaluate(scenario, placed, layersById, opts = {}) {
    const hintsUsed = opts.hintsUsed || 0;
    const ideal = scenario.ideal;
    const idealSet = new Set(ideal);
    const bonusSet = new Set(scenario.bonus || []);
    const irrelevantSet = new Set(scenario.irrelevant || []);

    const unique = [...new Set(placed)];
    const placedRequired = unique.filter((id) => idealSet.has(id));
    const missing = ideal.filter((id) => !unique.includes(id));
    const bonusUsed = unique.filter((id) => bonusSet.has(id));
    const irrelevantUsed = unique.filter((id) => irrelevantSet.has(id));

    const coverage = (placedRequired.length / ideal.length) * WEIGHTS.coverage;

    const orderMatch = lcs(placedRequired, ideal);
    const order = (orderMatch / ideal.length) * WEIGHTS.order;
    const orderRatio = placedRequired.length ? orderMatch / placedRequired.length : 0;

    const bonusCap = Math.min(BONUS_CAP, bonusSet.size || 1);
    const bonus = (Math.min(bonusUsed.length, bonusCap) / bonusCap) * WEIGHTS.bonus;

    const cost = costOf(unique, layersById);
    const budget = budgetFor(scenario, layersById);
    const overBudget = Math.max(0, cost - budget);

    const penalties = {
      irrelevant: irrelevantUsed.length * PENALTY.irrelevant,
      budget: Math.min(PENALTY.maxBudget, overBudget * PENALTY.perBudgetUnit),
      hints: hintsUsed * PENALTY.hint,
    };
    const penaltyTotal = penalties.irrelevant + penalties.budget + penalties.hints;

    const raw = coverage + order + bonus - penaltyTotal;
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    const feedback = [];
    for (const name of names(missing, layersById)) {
      feedback.push({ type: 'miss', text: `${name} eksik — bu senaryonun temel savunma katmanlarından biri.` });
    }

    const idealText = names(ideal, layersById).join(' → ');
    if (placedRequired.length >= 2) {
      if (orderRatio === 1) {
        feedback.push({ type: 'good', text: 'Katman sırası doğru — savunma, saldırının izleyeceği yolu takip ediyor.' });
      } else if (orderRatio >= 0.5) {
        feedback.push({ type: 'warn', text: `Katman sırası kısmen doğru. İdeal: ${idealText}.` });
      } else {
        feedback.push({ type: 'miss', text: `Katman sırası hatalı. İdeal: ${idealText}.` });
      }
    }

    if (bonusUsed.length) {
      feedback.push({ type: 'good', text: `İyi ekleme: ${names(bonusUsed, layersById).join(', ')} — savunmayı derinleştirir.` });
    }
    if (irrelevantUsed.length) {
      feedback.push({
        type: 'miss',
        text: `${names(irrelevantUsed, layersById).join(', ')} bu senaryoda etkisiz — bütçeyi boşa harcar (−${penalties.irrelevant}).`,
      });
    }
    if (overBudget > 0) {
      feedback.push({ type: 'warn', text: `Bütçe aşıldı: ${cost}/${budget} birim (−${penalties.budget}).` });
    }
    if (hintsUsed > 0) {
      feedback.push({ type: 'warn', text: `${hintsUsed} ipucu kullanıldı (−${penalties.hints}).` });
    }
    if (!missing.length && placedRequired.length === ideal.length && orderRatio === 1 && !irrelevantUsed.length) {
      feedback.push({ type: 'good', text: 'Tüm temel katmanlar doğru sırada — derinlemesine savunma sağlandı.' });
    }

    return {
      score,
      grade: gradeFor(score),
      breakdown: {
        coverage: Math.round(coverage),
        order: Math.round(order),
        bonus: Math.round(bonus),
        penalty: Math.round(penaltyTotal),
        penalties,
      },
      missing,
      bonusUsed,
      irrelevantUsed,
      orderRatio,
      cost,
      budget,
      feedback,
      simulation: simulate(scenario, unique),
    };
  }

  /** Henüz yerleştirilmemiş ilk zorunlu katmanı döndürür (ipucu için). */
  function nextHint(scenario, placed) {
    return scenario.ideal.find((id) => !placed.includes(id)) || null;
  }

  return { WEIGHTS, PENALTY, lcs, costOf, budgetFor, gradeFor, simulate, evaluate, nextHint };
});
