/* ============================================================================
   SITE YAPILANDIRMASI
   Canlıya çıkmadan önce SADECE bu dosyayı düzenlemeniz yeterli.
   Aşağıdaki "DOLDURULACAK" işaretli alanları gerçek değerlerle değiştirin.
   ========================================================================== */

window.SITE_CONFIG = {
  /* --------------------------------------------------------------------------
     1) İLETİŞİM FORMU  →  e-posta iletimi
     --------------------------------------------------------------------------
     Web3Forms ücretsiz ve backend gerektirmez.
     Kurulum (2 dakika):
       1. https://web3forms.com adresine gidin
       2. "Create Access Key" alanına  baris.karahuseyin28@gmail.com  yazın
       3. E-postanıza gelen doğrulama linkine tıklayın
       4. Size verilen anahtarı aşağıya yapıştırın

     Anahtar girilmediği sürece form otomatik olarak "e-posta uygulamasını aç"
     (mailto) yedek moduna düşer; yani site yine de çalışır, mesaj kaybolmaz.
  -------------------------------------------------------------------------- */
  web3formsAccessKey: "", // DOLDURULACAK — örn: "a1b2c3d4-1234-5678-9abc-def012345678"
  formRecipient: "baris.karahuseyin28@gmail.com",

  /* --------------------------------------------------------------------------
     2) CALENDLY  →  online randevu takvimi
     --------------------------------------------------------------------------
     Kurulum:
       1. https://calendly.com üzerinden ücretsiz hesap açın
       2. Etkinlik oluşturun (örn. "50 dk Online Psikoterapi Seansı")
       3. Etkinliğin herkese açık linkini aşağıya yapıştırın

     Boş bırakılırsa "Randevu" bölümü otomatik olarak gizlenir ve
     ziyaretçiler iletişim formuna yönlendirilir.
  -------------------------------------------------------------------------- */
  calendlyUrl: "https://calendly.com/seliinakgul/30min",

  /* --------------------------------------------------------------------------
     3) ANALİTİK  (isteğe bağlı)
     --------------------------------------------------------------------------
     GA4 çerez kullandığı için KVKK gereği YALNIZCA ziyaretçi çerez
     bildiriminde onay verdiğinde yüklenir. Bu davranış script.js içinde
     hazır; siz sadece ölçüm kimliğini girin.
     Çerezsiz alternatif isterseniz (önerilir): Plausible / Fathom / Umami.
  -------------------------------------------------------------------------- */
  ga4MeasurementId: "", // DOLDURULACAK — örn: "G-XXXXXXXXXX"

  /* --------------------------------------------------------------------------
     4) İLETİŞİM BİLGİLERİ
  -------------------------------------------------------------------------- */
  phoneDisplay: "+90 535 923 57 28",
  phoneRaw: "+905359235728",
  whatsappNumber: "905359235728",
  publicEmail: "psk.bariskarahuseyin@gmail.com",

  /* --------------------------------------------------------------------------
     5) ALAN ADI
     --------------------------------------------------------------------------
     DİKKAT: Bu değer sadece JS içindir. HTML dosyalarındaki
     <link rel="canonical">, og:url ve sitemap.xml içindeki
     https://www.bariskarahuseyin.com adresini de kendi alan adınızla
     TOPLU DEĞİŞTİR (Find & Replace) yapmanız gerekir.
  -------------------------------------------------------------------------- */
  siteUrl: "https://www.bariskarahuseyin.com"
};
