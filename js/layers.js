/**
 * JAVERT Architect — güvenlik katmanı kataloğu.
 *
 * Her katman: id, ad, simge, kategori, maliyet (bütçe birimi),
 * kısa açıklama ve MITRE / NIST CSF eşlemesi için ipuçları.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JavertLayers = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CATEGORIES = {
    perimeter: 'Çevre',
    network: 'Ağ',
    endpoint: 'Uç Nokta',
    identity: 'Kimlik',
    data: 'Veri',
    detect: 'Tespit',
    recover: 'Kurtarma',
    people: 'İnsan',
    ot: 'OT / ICS',
    app: 'Uygulama',
  };

  const LAYERS = [
    { id: 'email_gw', name: 'E-posta Güvenlik Ağ Geçidi', icon: '✉️', category: 'perimeter', cost: 3,
      desc: 'Zararlı ekleri, bağlantıları ve kimlik avını filtreler.', nist: 'PR' },
    { id: 'awareness', name: 'Güvenlik Farkındalık Eğitimi', icon: '🎓', category: 'people', cost: 1,
      desc: 'Çalışanların kimlik avı ve sosyal mühendisliği tanımasını sağlar.', nist: 'PR' },
    { id: 'edr', name: 'Uç Nokta Koruması (EDR)', icon: '🛡️', category: 'endpoint', cost: 3,
      desc: 'Uç noktadaki şüpheli davranışı algılar, durdurur ve izole eder.', nist: 'DE' },
    { id: 'segmentation', name: 'İç Segmentasyon', icon: '🧩', category: 'network', cost: 3,
      desc: 'Yatay hareketi sınırlar ve kritik sistemleri ayrı bölgelerde tutar.', nist: 'PR' },
    { id: 'offline_backup', name: 'Çevrimdışı Yedek', icon: '💾', category: 'recover', cost: 2,
      desc: 'Saldırganın erişemediği, geri dönüşü test edilmiş kopya sağlar.', nist: 'RC' },
    { id: 'mfa', name: 'MFA / Passkey', icon: '🔑', category: 'identity', cost: 1,
      desc: 'Çalınan parolaların tek başına erişim sağlamasını engeller.', nist: 'PR' },
    { id: 'siem', name: 'SIEM / İzleme', icon: '👁️', category: 'detect', cost: 4,
      desc: 'Güvenlik olaylarını merkezi olarak toplar ve ilişkilendirir.', nist: 'DE' },
    { id: 'patch', name: 'Yazılım Güncelleme / Yama', icon: '🔧', category: 'endpoint', cost: 1,
      desc: 'Bilinen zafiyetleri kapatarak saldırı yüzeyini daraltır.', nist: 'PR' },
    { id: 'ir_plan', name: 'Olay Müdahale Planı', icon: '📋', category: 'recover', cost: 1,
      desc: 'İzolasyon, iletişim ve kurtarma adımlarını önceden tanımlar.', nist: 'RS' },
    { id: 'ngfw', name: 'Yeni Nesil Güvenlik Duvarı', icon: '🧱', category: 'perimeter', cost: 3,
      desc: 'Uygulama farkındalıklı trafik denetimi ve erişim politikası uygular.', nist: 'PR' },
    { id: 'waf', name: 'Web Uygulama Güvenlik Duvarı', icon: '🕸️', category: 'app', cost: 2,
      desc: 'SQLi, XSS gibi web saldırılarını uygulama önünde keser.', nist: 'PR' },
    { id: 'ddos', name: 'DDoS Koruması / CDN', icon: '🌊', category: 'perimeter', cost: 3,
      desc: 'Hacimsel trafiği dağıtır ve temizleyerek hizmeti ayakta tutar.', nist: 'PR' },
    { id: 'ids', name: 'IDS / IPS', icon: '🚨', category: 'network', cost: 2,
      desc: 'Ağ trafiğindeki saldırı imzalarını ve anomalileri yakalar.', nist: 'DE' },
    { id: 'ztna', name: 'Sıfır Güven Erişimi (ZTNA)', icon: '🔐', category: 'identity', cost: 3,
      desc: 'Her isteği kimlik, cihaz ve bağlama göre doğrular; ağa değil uygulamaya erişim verir.', nist: 'PR' },
    { id: 'pam', name: 'Ayrıcalıklı Erişim Yönetimi (PAM)', icon: '👑', category: 'identity', cost: 3,
      desc: 'Yönetici hesaplarını kasada tutar, oturumları kaydeder, tam zamanında yetki verir.', nist: 'PR' },
    { id: 'dlp', name: 'Veri Kaybı Önleme (DLP)', icon: '🚫', category: 'data', cost: 3,
      desc: 'Hassas verinin e-posta, bulut veya USB ile dışarı çıkmasını engeller.', nist: 'PR' },
    { id: 'encryption', name: 'Veri Şifreleme', icon: '🔒', category: 'data', cost: 2,
      desc: 'Durağan ve aktarılan veriyi okunamaz hale getirir.', nist: 'PR' },
    { id: 'dmz', name: 'DMZ (Arındırılmış Bölge)', icon: '🏰', category: 'network', cost: 2,
      desc: 'Dışa açık servisleri iç ağdan ayrı bir tampon bölgede çalıştırır.', nist: 'PR' },
    { id: 'diode', name: 'Veri Diyotu (Tek Yönlü Geçit)', icon: '➡️', category: 'ot', cost: 4,
      desc: 'Veriyi fiziksel olarak yalnızca OT\'den BT\'ye akıtır; geri yön imkânsızdır.', nist: 'PR' },
    { id: 'ics_monitor', name: 'OT / ICS Ağ İzleme', icon: '🏭', category: 'ot', cost: 3,
      desc: 'Modbus, DNP3, IEC-104 gibi endüstriyel protokollerde anomali arar.', nist: 'DE' },
    { id: 'nac', name: 'Ağ Erişim Kontrolü (NAC)', icon: '🚪', category: 'network', cost: 2,
      desc: 'Yalnızca tanınan ve uyumlu cihazların ağa bağlanmasına izin verir.', nist: 'PR' },
    { id: 'secure_dev', name: 'Güvenli Kodlama / SAST', icon: '🧪', category: 'app', cost: 2,
      desc: 'Zafiyetleri yazılım daha yayına çıkmadan kaynak kodda yakalar.', nist: 'PR' },
    { id: 'honeypot', name: 'Bal Küpü / Aldatma', icon: '🍯', category: 'detect', cost: 2,
      desc: 'Sahte varlıklarla saldırganı erken fark eder ve oyalar.', nist: 'DE' },
    { id: 'usb_control', name: 'Çıkarılabilir Medya Kontrolü', icon: '💽', category: 'endpoint', cost: 1,
      desc: 'USB ve harici diskleri beyaz liste ile sınırlar.', nist: 'PR' },
    { id: 'vuln_scan', name: 'Zafiyet Taraması', icon: '🔍', category: 'detect', cost: 1,
      desc: 'Sistemleri düzenli tarayarak yamalanmamış açıkları listeler.', nist: 'ID' },
  ];

  const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

  return { CATEGORIES, LAYERS, byId };
});
