/**
 * JAVERT Architect — görev senaryoları.
 *
 * ideal      : Kaynaktan hedefe doğru ideal katman sırası (zorunlu katmanlar).
 * bonus      : Savunmayı derinleştiren, puan kazandıran ek katmanlar.
 * irrelevant : Bu senaryoya katkısı olmayan, bütçeyi boşa harcayan katmanlar.
 * killChain  : Saldırı simülasyonunda oynatılan aşamalar ve onları kesen katmanlar.
 *              phase "prevent" = önleme, "recover" = kurtarma aşaması.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JavertScenarios = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCENARIOS = [
    {
      id: 'ransomware',
      title: 'Fidye Yazılımına Dayanıklılık',
      difficulty: 'ORTA',
      brief: 'Fidye çeteleri hedefte. Hem saldırıyı önleyen hem de en kötü durumda kurtaran bir mimari kur — önlemek ve kurtarmak birlikte.',
      source: { name: 'İnternet', icon: '🌐', note: 'saldırı buradan gelir' },
      target: { name: 'Dosya Sunucuları', icon: '🗂️' },
      ideal: ['email_gw', 'edr', 'segmentation', 'siem', 'offline_backup', 'ir_plan'],
      bonus: ['awareness', 'mfa', 'patch'],
      irrelevant: ['ddos', 'waf', 'diode', 'ics_monitor'],
      rationale: 'Fidye savunması tek ürüne dayanmaz: giriş kanalı daraltılır, uç noktada davranış durdurulur, yayılım segmentasyonla sınırlanır; çevrimdışı yedek ve olay planı kurtarmayı güvenceye alır.',
      killChain: [
        { stage: 'İlk Erişim', technique: 'T1566', label: 'Kimlik avı e-postası', counters: ['email_gw', 'awareness'], phase: 'prevent' },
        { stage: 'Yürütme', technique: 'T1204', label: 'Kullanıcı zararlı eki açar', counters: ['edr'], phase: 'prevent' },
        { stage: 'Yanal Hareket', technique: 'T1021', label: 'SMB / RDP ile yayılım', counters: ['segmentation', 'mfa'], phase: 'prevent' },
        { stage: 'Etki', technique: 'T1486', label: 'Dosyaların şifrelenmesi', counters: ['siem', 'edr'], phase: 'prevent' },
        { stage: 'Kurtarma', technique: 'T1490', label: 'Yedeklerin silinmesi girişimi', counters: ['offline_backup', 'ir_plan'], phase: 'recover' },
      ],
    },
    {
      id: 'phishing',
      title: 'Kimlik Avı Kampanyası',
      difficulty: 'KOLAY',
      brief: 'Finans ekibine sahte fatura e-postaları geliyor. Kullanıcı hesaplarını ve kurumsal e-postayı koruyacak bir zincir kur.',
      source: { name: 'İnternet', icon: '🌐', note: 'sahte e-postalar buradan gelir' },
      target: { name: 'Kullanıcı Hesapları', icon: '👥' },
      ideal: ['email_gw', 'awareness', 'mfa', 'edr', 'siem'],
      bonus: ['dlp', 'ir_plan', 'patch'],
      irrelevant: ['ddos', 'diode', 'ics_monitor', 'waf'],
      rationale: 'Kimlik avı önce ağ geçidinde süzülür, kalan e-postayı eğitimli kullanıcı tanır; yine de parola çalınırsa MFA erişimi durdurur, EDR ve SIEM sızıntıyı görünür kılar.',
      killChain: [
        { stage: 'İlk Erişim', technique: 'T1566.002', label: 'Sahte bağlantı içeren e-posta', counters: ['email_gw'], phase: 'prevent' },
        { stage: 'Kullanıcı Etkileşimi', technique: 'T1204.001', label: 'Kullanıcı bağlantıya tıklar', counters: ['awareness'], phase: 'prevent' },
        { stage: 'Kimlik Bilgisi', technique: 'T1078', label: 'Çalınan parola ile giriş', counters: ['mfa'], phase: 'prevent' },
        { stage: 'Kalıcılık', technique: 'T1114', label: 'Posta kutusu kuralı / veri toplama', counters: ['edr', 'siem'], phase: 'prevent' },
      ],
    },
    {
      id: 'webapp',
      title: 'Web Uygulaması Saldırısı',
      difficulty: 'ORTA',
      brief: 'Müşteri portalına SQL enjeksiyonu ve otomatik tarama trafiği geliyor. Veritabanına ulaşmadan durdur.',
      source: { name: 'İnternet', icon: '🌐', note: 'botlar ve saldırganlar' },
      target: { name: 'Müşteri Veritabanı', icon: '🗄️' },
      ideal: ['ddos', 'waf', 'dmz', 'secure_dev', 'segmentation', 'encryption'],
      bonus: ['siem', 'vuln_scan', 'patch', 'ids'],
      irrelevant: ['email_gw', 'awareness', 'usb_control', 'diode', 'ics_monitor'],
      rationale: 'Dışa açık uygulama katmanlı korunur: trafik CDN\'de süzülür, WAF saldırı kalıplarını keser, uygulama DMZ\'de yaşar ve güvenli kodlanır; veritabanı ayrı segmentte ve şifreli tutulur.',
      killChain: [
        { stage: 'Keşif', technique: 'T1595', label: 'Otomatik zafiyet taraması', counters: ['ddos', 'ids'], phase: 'prevent' },
        { stage: 'İlk Erişim', technique: 'T1190', label: 'SQL enjeksiyonu', counters: ['waf', 'secure_dev'], phase: 'prevent' },
        { stage: 'Kalıcılık', technique: 'T1505.003', label: 'Web shell yükleme', counters: ['dmz', 'patch'], phase: 'prevent' },
        { stage: 'Toplama', technique: 'T1213', label: 'Veritabanına erişim', counters: ['segmentation'], phase: 'prevent' },
        { stage: 'Sızdırma', technique: 'T1041', label: 'Müşteri verisinin çıkarılması', counters: ['encryption', 'siem'], phase: 'recover' },
      ],
    },
    {
      id: 'scada',
      title: 'Boru Hattı SCADA Koruması',
      difficulty: 'ZOR',
      brief: 'Doğal gaz boru hattının kontrol sistemleri kurumsal ağa bağlı. Kritik altyapıyı BT\'den gelen tehditlere karşı yalıt.',
      source: { name: 'Kurumsal BT Ağı', icon: '🏢', note: 'tehdit BT\'den OT\'ye sıçrar' },
      target: { name: 'SCADA / PLC Sistemleri', icon: '⚙️' },
      ideal: ['ngfw', 'dmz', 'diode', 'ics_monitor', 'usb_control', 'offline_backup', 'ir_plan'],
      bonus: ['pam', 'mfa', 'nac', 'honeypot'],
      irrelevant: ['waf', 'ddos', 'email_gw', 'dlp'],
      rationale: 'IEC 62443 / Purdue modeline göre BT ile OT arasına güvenlik duvarı ve DMZ konur, veri diyotu tek yönlü akış sağlar; endüstriyel protokoller izlenir, USB ile bulaşma kesilir, PLC yapılandırmaları çevrimdışı yedeklenir.',
      killChain: [
        { stage: 'İlk Erişim', technique: 'T0886', label: 'BT\'den uzaktan servis erişimi', counters: ['ngfw', 'dmz'], phase: 'prevent' },
        { stage: 'Yanal Hareket', technique: 'T0867', label: 'Araç transferi ile OT\'ye geçiş', counters: ['diode'], phase: 'prevent' },
        { stage: 'Bulaşma', technique: 'T0847', label: 'USB ile replikasyon', counters: ['usb_control'], phase: 'prevent' },
        { stage: 'Etki', technique: 'T0836', label: 'Basınç parametrelerini değiştirme', counters: ['ics_monitor'], phase: 'prevent' },
        { stage: 'Kurtarma', technique: 'T0879', label: 'Kontrol kaybı / hasar', counters: ['offline_backup', 'ir_plan'], phase: 'recover' },
      ],
    },
    {
      id: 'insider',
      title: 'İçeriden Gelen Tehdit',
      difficulty: 'ZOR',
      brief: 'Ayrılmak üzere olan yetkili bir çalışan ticari sırları dışarı çıkarmaya hazırlanıyor. Yetkiyi sınırla, sızıntıyı engelle.',
      source: { name: 'Kötü Niyetli Çalışan', icon: '🕵️', note: 'tehdit zaten içeride' },
      target: { name: 'Ticari Sırlar', icon: '📁' },
      ideal: ['mfa', 'pam', 'segmentation', 'dlp', 'encryption', 'siem'],
      bonus: ['usb_control', 'honeypot', 'ir_plan', 'awareness'],
      irrelevant: ['ddos', 'waf', 'email_gw', 'diode'],
      rationale: 'İç tehditte çevre savunması işe yaramaz: en az yetki ilkesi PAM ile uygulanır, veri segmentlerde tutulur, DLP ve şifreleme sızıntıyı engeller, SIEM / UEBA anormal davranışı görünür kılar.',
      killChain: [
        { stage: 'Yetki Kötüye Kullanımı', technique: 'T1078', label: 'Meşru hesapla erişim', counters: ['mfa', 'pam'], phase: 'prevent' },
        { stage: 'Keşif', technique: 'T1083', label: 'Paylaşımlarda dosya arama', counters: ['segmentation', 'honeypot'], phase: 'prevent' },
        { stage: 'Toplama', technique: 'T1005', label: 'Yerel sisteme veri kopyalama', counters: ['encryption'], phase: 'prevent' },
        { stage: 'Sızdırma', technique: 'T1052', label: 'USB / bulut ile veri çıkarma', counters: ['dlp', 'usb_control'], phase: 'prevent' },
        { stage: 'Tespit', technique: 'T1567', label: 'Olağandışı hacim', counters: ['siem'], phase: 'recover' },
      ],
    },
    {
      id: 'remote',
      title: 'Uzaktan Çalışma Güvenliği',
      difficulty: 'KOLAY',
      brief: 'Saha mühendisleri evden ve sahadan iç uygulamalara bağlanıyor. Güvenli ve izlenebilir uzaktan erişim tasarla.',
      source: { name: 'Ev / Saha Ağları', icon: '🏠', note: 'güvenilmeyen ağlar' },
      target: { name: 'İç Uygulamalar', icon: '🖥️' },
      ideal: ['ztna', 'mfa', 'edr', 'nac', 'siem'],
      bonus: ['patch', 'dlp', 'encryption'],
      irrelevant: ['ddos', 'diode', 'ics_monitor', 'waf'],
      rationale: 'Sıfır güven yaklaşımında her bağlantı doğrulanır: ZTNA uygulama bazlı erişim verir, MFA kimliği kanıtlar, EDR ve NAC cihaz sağlığını garanti eder, SIEM oturumları izler.',
      killChain: [
        { stage: 'İlk Erişim', technique: 'T1133', label: 'Açık VPN / RDP servisi', counters: ['ztna'], phase: 'prevent' },
        { stage: 'Kimlik Bilgisi', technique: 'T1110', label: 'Parola püskürtme', counters: ['mfa'], phase: 'prevent' },
        { stage: 'Cihaz', technique: 'T1204', label: 'Enfekte ev bilgisayarı', counters: ['edr', 'nac'], phase: 'prevent' },
        { stage: 'Tespit', technique: 'T1078', label: 'Olağandışı konumdan oturum', counters: ['siem'], phase: 'recover' },
      ],
    },
    {
      id: 'ddos',
      title: 'Dağıtık Hizmet Engelleme',
      difficulty: 'KOLAY',
      brief: 'Hacktivist grup online abone hizmetlerine DDoS saldırısı duyurdu. Hizmeti ayakta tut.',
      source: { name: 'Botnet', icon: '🤖', note: 'binlerce kaynak IP' },
      target: { name: 'Online Hizmetler', icon: '🌍' },
      ideal: ['ddos', 'ngfw', 'ids', 'waf', 'siem'],
      bonus: ['ir_plan', 'dmz'],
      irrelevant: ['offline_backup', 'usb_control', 'awareness', 'diode', 'dlp'],
      rationale: 'Hacimsel saldırı en dışta, servis sağlayıcı / CDN seviyesinde emilir; protokol saldırıları güvenlik duvarı ve IPS\'te, uygulama katmanı saldırıları WAF\'ta kesilir. SIEM ve müdahale planı saldırı sırasında koordinasyonu sağlar.',
      killChain: [
        { stage: 'Hacimsel', technique: 'T1498.001', label: 'UDP yansıtma seli', counters: ['ddos'], phase: 'prevent' },
        { stage: 'Protokol', technique: 'T1499.001', label: 'SYN seli', counters: ['ngfw', 'ids'], phase: 'prevent' },
        { stage: 'Uygulama', technique: 'T1499.002', label: 'HTTP GET seli', counters: ['waf'], phase: 'prevent' },
        { stage: 'Müdahale', technique: 'T1498', label: 'Uzayan kesinti', counters: ['siem', 'ir_plan'], phase: 'recover' },
      ],
    },
    {
      id: 'apt',
      title: 'Tedarik Zinciri / APT',
      difficulty: 'ZOR',
      brief: 'Güvenilen bir yazılım güncellemesine arka kapı yerleştirilmiş. Devlet destekli grup etki alanı denetleyicisini hedefliyor.',
      source: { name: 'Tedarikçi Güncellemesi', icon: '📦', note: 'güvenilen kanal' },
      target: { name: 'Etki Alanı Denetleyicisi', icon: '🏛️' },
      ideal: ['patch', 'edr', 'segmentation', 'pam', 'honeypot', 'siem', 'ir_plan'],
      bonus: ['vuln_scan', 'mfa', 'ngfw', 'offline_backup'],
      irrelevant: ['ddos', 'waf', 'email_gw', 'awareness'],
      rationale: 'Tedarik zincirinde giriş engellenemeyebilir; bu yüzden ihlal varsayımıyla tasarlanır: güncellemeler doğrulanır, EDR davranışı yakalar, segmentasyon ve PAM yönetici kimliklerine giden yolu kapatır, aldatma ve SIEM saldırganı erken açığa çıkarır.',
      killChain: [
        { stage: 'İlk Erişim', technique: 'T1195.002', label: 'Arka kapılı güncelleme', counters: ['patch', 'vuln_scan'], phase: 'prevent' },
        { stage: 'Komuta-Kontrol', technique: 'T1071', label: 'Gizli C2 iletişimi', counters: ['edr', 'ngfw'], phase: 'prevent' },
        { stage: 'Kimlik Bilgisi', technique: 'T1003', label: 'LSASS bellek dökümü', counters: ['pam', 'edr'], phase: 'prevent' },
        { stage: 'Yanal Hareket', technique: 'T1550.002', label: 'Pass-the-Hash', counters: ['segmentation', 'honeypot'], phase: 'prevent' },
        { stage: 'Hedef', technique: 'T1484', label: 'Etki alanı politikası değişikliği', counters: ['siem', 'ir_plan'], phase: 'recover' },
      ],
    },
  ];

  const byId = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

  return { SCENARIOS, byId };
});
