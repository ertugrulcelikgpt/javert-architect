const test = require('node:test');
const assert = require('node:assert/strict');

const { LAYERS, byId: L } = require('../js/layers.js');
const { SCENARIOS, byId: S } = require('../js/scenarios.js');
const Engine = require('../js/engine.js');

test('lcs: en uzun ortak alt dizi', () => {
  assert.equal(Engine.lcs(['a', 'b', 'c'], ['a', 'b', 'c']), 3);
  assert.equal(Engine.lcs(['c', 'b', 'a'], ['a', 'b', 'c']), 1);
  assert.equal(Engine.lcs(['a', 'c'], ['a', 'b', 'c']), 2);
  assert.equal(Engine.lcs([], ['a']), 0);
});

test('veri bütünlüğü: senaryolardaki tüm katman id\'leri katalogda var', () => {
  const ids = new Set(LAYERS.map((l) => l.id));
  assert.equal(ids.size, LAYERS.length, 'katman id\'leri benzersiz olmalı');
  for (const s of SCENARIOS) {
    const all = [...s.ideal, ...s.bonus, ...s.irrelevant, ...s.killChain.flatMap((k) => k.counters)];
    for (const id of all) assert.ok(ids.has(id), `${s.id}: bilinmeyen katman ${id}`);
    const overlap = s.ideal.filter((id) => s.bonus.includes(id) || s.irrelevant.includes(id));
    assert.deepEqual(overlap, [], `${s.id}: ideal katman bonus/gereksiz listesinde olamaz`);
  }
});

test('her senaryoda ideal mimari + 3 bonus = 100 puan ve saldırı durdurulur', () => {
  for (const s of SCENARIOS) {
    const placed = [...s.ideal, ...s.bonus.slice(0, 3)];
    const budget = Engine.budgetFor(s, L);
    const res = Engine.evaluate(s, placed, L);
    const expected = Engine.costOf(placed, L) > budget ? res.score : 100;
    assert.equal(res.score, expected, `${s.id}`);
    assert.equal(res.simulation.outcome, 'stopped', `${s.id}`);
    assert.equal(res.missing.length, 0);
  }
});

test('yalnızca ideal mimari en az 85 puan (MÜKEMMEL) alır', () => {
  for (const s of SCENARIOS) {
    const res = Engine.evaluate(s, s.ideal, L);
    assert.equal(res.score, 85, s.id);
    assert.equal(res.grade.key, 'excellent');
  }
});

test('boş mimari 0 puan ve ihlal', () => {
  const res = Engine.evaluate(S.ransomware, [], L);
  assert.equal(res.score, 0);
  assert.equal(res.simulation.outcome, 'breach');
  assert.equal(res.missing.length, S.ransomware.ideal.length);
});

test('ters sıra, doğru sıradan daha az puan alır', () => {
  const s = S.ransomware;
  const ok = Engine.evaluate(s, s.ideal, L).score;
  const rev = Engine.evaluate(s, [...s.ideal].reverse(), L);
  assert.ok(rev.score < ok);
  assert.ok(rev.feedback.some((f) => f.text.startsWith('Katman sırası hatalı')));
});

test('gereksiz katman ve ipucu ceza verir', () => {
  const s = S.ransomware;
  const base = Engine.evaluate(s, s.ideal, L).score;
  const withWaf = Engine.evaluate(s, [...s.ideal, 'waf'], L);
  assert.equal(withWaf.score, base - Engine.PENALTY.irrelevant);
  assert.deepEqual(withWaf.irrelevantUsed, ['waf']);
  const withHint = Engine.evaluate(s, s.ideal, L, { hintsUsed: 2 });
  assert.equal(withHint.score, base - 2 * Engine.PENALTY.hint);
});

test('bütçe aşımı ceza verir', () => {
  const s = S.phishing;
  const all = LAYERS.map((l) => l.id).filter((id) => !s.irrelevant.includes(id));
  const res = Engine.evaluate(s, all, L);
  assert.ok(res.cost > res.budget);
  assert.ok(res.breakdown.penalties.budget > 0);
  assert.ok(res.breakdown.penalties.budget <= Engine.PENALTY.maxBudget);
});

test('ekran görüntüsündeki örnek: SIEM + Yama + Olay Planı → düşük puan, 4 eksik', () => {
  const s = S.ransomware;
  const res = Engine.evaluate(s, ['patch', 'siem', 'ir_plan'], L);
  assert.equal(res.missing.length, 4);
  assert.equal(res.grade.key, 'poor');
  // Yalnızca SIEM şifreleme aşamasında devreye girer — derinlik zayıf
  assert.equal(res.simulation.stoppedAt.stage, 'Etki');
  assert.equal(res.simulation.depth, 1);
});

test('simülasyon: yalnızca yedek varsa saldırı önlenemez ama kurtarılır', () => {
  const sim = Engine.simulate(S.ransomware, ['offline_backup']);
  assert.equal(sim.outcome, 'contained');
  assert.equal(sim.depth, 0);
});

test('ipucu: ilk eksik zorunlu katmanı verir', () => {
  const s = S.ransomware;
  assert.equal(Engine.nextHint(s, []), 'email_gw');
  assert.equal(Engine.nextHint(s, ['email_gw']), 'edr');
  assert.equal(Engine.nextHint(s, s.ideal), null);
});

test('puan her zaman 0–100 aralığında', () => {
  for (const s of SCENARIOS) {
    const worst = Engine.evaluate(s, s.irrelevant, L, { hintsUsed: 10 });
    assert.equal(worst.score, 0);
  }
});
