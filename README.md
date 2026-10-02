# Uzm. Psk. Barış Karahüseyin — Web Sitesi

Tek sayfa + blog yapısı (HTML / CSS / vanilla JS) ve üzerine küçük bir Node.js
sunucusu: danışan mesajlarını kaydeden ve blog yazılarını yönetmenizi sağlayan
**yönetim paneli** (`/admin`).

> Sunucu olmadan da site statik olarak çalışır (form bu durumda Web3Forms /
> mailto yedeğine düşer, blog kartları HTML'deki hâliyle görünür). Panel ve
> mesaj kutusu için Node sunucusunun çalışıyor olması gerekir.

---

## 🛠 Yönetim paneli

### Çalıştırma

```bash
npm install
npm start
```

- Site: `http://localhost:3000`
- Panel: `http://localhost:3000/admin/`
- Port değiştirmek için: `PORT=8080 npm start`
- Veri klasörlerini taşımak için: `DATA_DIR=/kalici/disk/data UPLOAD_DIR=/kalici/disk/uploads npm start`
  (göreli yol verilirse proje köküne göre çözülür; site kökünün altındaysa dışarıya kapatılır)
- Kod değişikliğinden sonra sunucuyu durdurup (`Ctrl+C`) yeniden `npm start` deyin; şablonlar bellekte tutulur.

**İlk açılış:** panel sizden bir yönetici parolası belirlemenizi ister (en az 8
karakter). Sonraki girişlerde bu parola kullanılır; "Ayarlar" sayfasından
değiştirebilirsiniz. 6 hatalı denemeden sonra 10 dakika bekleme uygulanır.

### Neler yapılır

| Bölüm           | Ne işe yarar                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Genel bakış     | Yeni mesaj sayısı, son mesajlar, son düzenlenen yazılar.                                                                                               |
| Mesajlar        | İletişim formundan gelen mesajlar. Açınca "okundu" olur; Yanıtlandı / Arşiv durumu, tek tık ara / WhatsApp / e-posta, yalnızca sizin gördüğünüz not.   |
| Blog yazıları   | Yazı ekle, düzenle, taslak olarak sakla, yayınla, önizle. Görsel editör (Quill) veya ham HTML. Kapak görseli yükleme, SSS bölümü, meta açıklama, slug. |
| Ayarlar         | Parola değiştirme, sunucu bilgileri.                                                                                                                   |

Yayınlanan yazılar `/blog/<slug>.html` adresinde, elle yazılmış yazılarla aynı
tasarımda üretilir; ana sayfa ve `blog.html` kartları, `sitemap.xml` ve JSON-LD
yapısal veri otomatik güncellenir.

**Mevcut 4 yazı** ilk çalıştırmada panele aktarıldı ve artık oradan düzenlenir.
`blog/*.html` dosyaları diskte duruyor ama sunucu aynı adreste veritabanındaki
sürümü gösterir. Bu yazılar özel kutular (tanım kutusu, içindekiler) içerdiği
için editör onları **HTML** sekmesinde açar; görsel moda geçerseniz kutular sade
paragrafa dönüşür (uyarı verilir).

### Veriler ve yedek

- `data/` — mesajlar, yazılar, parola özeti, oturum anahtarı. **Git'e girmez.**
- `uploads/` — panelden yüklenen görseller. **Git'e girmez.**

Yedek almak için bu iki klasörü kopyalamanız yeterli.

### E-posta bildirimi

Mesajlar her durumda panele düşer. Ek olarak her mesaj için e-posta da almak
isterseniz `config.js` içindeki `web3formsAccessKey` alanını doldurun; sunucu
mesajı kaydettikten sonra Web3Forms'a da iletir.

### Canlıya alma

Panel için Node.js çalıştıran bir ortam gerekir: VPS (pm2 ile), Render,
Railway, Fly.io ya da Node destekli cPanel. Örnek (pm2):

```bash
npm install --omit=dev
PORT=3000 pm2 start server.js --name psikolog-site
```

Sunucunun önüne HTTPS veren bir reverse proxy (Nginx / Caddy / platformun
kendi proxy'si) koyun; oturum çerezi HTTPS'te otomatik olarak `Secure` işaretlenir.
Dosya tabanlı veri kullanıldığı için tek sunucu örneği çalıştırın ve `data/` +
`uploads/` klasörlerinin kalıcı diskte olduğundan emin olun (Render/Railway'de
"persistent disk" / "volume").

---

## 🚀 Canlıya çıkmadan önce yapılacaklar

### 1. `config.js` dosyasını doldurun

Tek yapılandırma noktası burasıdır.

| Alan                          | Ne yapmalı                                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `web3formsAccessKey`          | [web3forms.com](https://web3forms.com) → "Create Access Key" → e-posta olarak `baris.karahuseyin28@gmail.com` girin → doğrulama linkine tıklayın → anahtarı buraya yapıştırın. **Boş bırakılırsa form otomatik olarak `mailto:` yedeğine düşer, mesaj kaybolmaz.** |
| `calendlyUrl`                 | Şu an `https://calendly.com/seliinakgul/30min` girili. Kendi hesabınıza geçtiğinizde bu linki değiştirin. **Boş bırakılırsa "Randevu" bölümü görünmeye devam eder, takvim yerine telefon / WhatsApp / form seçenekleri gösterilir.**                               |
| `ga4MeasurementId`            | İsteğe bağlı. `G-XXXXXXXXXX`. Yalnızca ziyaretçi çerez onayı verirse yüklenir.                                                                                                                                                                                     |
| `phoneRaw` / `whatsappNumber` | Numara değişirse güncelleyin.                                                                                                                                                                                                                                      |

### 2. Alan adını değiştirin

Tüm HTML dosyalarında ve `sitemap.xml` + `robots.txt` içinde geçen
`https://www.bariskarahuseyin.com` adresini kendi alan adınızla **toplu değiştirin**
(VS Code: `Ctrl+Shift+H`). Bu adres `canonical`, `og:url` ve yapısal veride kullanılıyor.

### 3. Profil fotoğrafını değiştirin

`about-baris.jpeg` yerine profesyonel bir portre koyun.

- **Format:** WebP veya JPEG (PNG değil)
- **Boyut:** ~4:5 dikey, 800×1000 px civarı
- **Dosya boyutu:** 150 KB altı — mevcut PNG 828 KB ve sayfanın en ağır varlığı
- Dosya adını değiştirirseniz `index.html` içindeki `src` ve `og:image` alanlarını da güncelleyin
- Dosya adında **Türkçe karakter ve boşluk kullanmayın** (Linux hosting'de 404 verir)

### 4. Hukuki metinleri gözden geçirtin

`kvkk-aydinlatma-metni.html` ve `gizlilik-politikasi.html` birer **taslaktır**.
Her ikisinin sonunda turuncu bir "yayın öncesi not" kutusu var —
**avukat onayından sonra bu kutuları silin.**

### 5. Google Search Console

Siteyi doğrulayın ve `sitemap.xml` adresini gönderin.

---

## 📁 Dosya yapısı

```
.
├── server.js                     Node sunucusu (site + panel API)
├── package.json
├── admin/                        Yönetim paneli (index.html, admin.js, admin.css, vendor/quill)
├── lib/                          Sunucu modülleri (store, auth, render, importLegacy)
├── data/                         Mesajlar, yazılar, parola — git'e girmez
├── uploads/                      Panelden yüklenen görseller — git'e girmez
├── index.html                    Ana sayfa (tek sayfa scroll)
├── blog.html                     Blog liste sayfası
├── kvkk-aydinlatma-metni.html    Hukuki — KVKK m.10 aydınlatma
├── gizlilik-politikasi.html      Hukuki — çerez + terapi gizliliği
├── config.js                     ⚙️ TEK YAPILANDIRMA DOSYASI
├── script.js                     Tüm davranışlar (tüm sayfalarda ortak)
├── style.css                     Tüm stiller (tüm sayfalarda ortak)
├── favicon.svg
├── robots.txt                    Arama + üretken AI botlarına açık
├── sitemap.xml
├── about-baris.jpeg               Profil fotoğrafı (değiştirilecek)
├── terap.jpg                     Psikoterapi görseli
└── blog/
    ├── kaygi-nedir-belirtileri-ve-basa-cikma-yollari.html
    ├── iliskilerde-sinir-koymak.html
    ├── emdr-terapisi-nedir.html
    └── online-terapi-etkili-mi.html
```

---

## ✍️ Yeni blog yazısı eklemek

Panelden: **Blog yazıları → + Yeni yazı**. Başlık, kategori, kart özeti,
giriş paragrafı ve içeriği girin; isterseniz kapak görseli yükleyin ve SSS
soruları ekleyin. "Önizle" ile yayınlamadan bakabilir, "Taslak olarak kaydet"
ile sonra devam edebilirsiniz. "Yayınla" dediğiniz anda yazı siteye, ana sayfa
kartlarına, `blog.html` listesine ve `sitemap.xml`'e düşer; `<title>`, meta
açıklama, canonical, Open Graph ve `BlogPosting` + `FAQPage` + `BreadcrumbList`
yapısal verisi otomatik üretilir.

**GEO (üretken arama motorları) için:** Görünür kısımda soru biçiminde `<h2>`
başlıklar kullanın ve SSS bölümünü doldurun; SSS cevapları sayfada ve JSON-LD
içinde birebir aynı çıkar.

**Yazıları birbirine benzetmeyin.** Aynı iskeleti (özet kutusu, içindekiler,
tanım kutusu, akordeon) her yazıda tekrarlamak metinlere şablon görüntüsü
veriyor. Uzunluk, bölüm sayısı ve giriş biçimi yazıdan yazıya değişsin.

---

## 🧪 Yerelde çalıştırma

`file://` ile açmayın — `fetch` ve bazı özellikler engellenir. Basit bir sunucu:

```bash
npx serve .
```

---

## ♿ Erişilebilirlik notları

- Tüm etkileşimli öğelerde görünür `:focus-visible` halkası var
- `prefers-reduced-motion` desteklenir: reveal animasyonları, imleç ışıması, hover
  hareketleri ve imleç yanıp sönmesi kapanır. **Yazı efekti ve kaydırma animasyonu
  bilinçli olarak bu tercihten muaf tutuldu** (site sahibinin isteği); geri almak için
  `script.js` içindeki `setupTyping()` ve `scrollToTarget()` notlarına bakın.
- Hamburger menüde `aria-expanded` / `aria-controls`, Escape ile kapatma ve odak dönüşü var
- Form alanlarında gerçek `<label>`, `name`, `autocomplete` ve `role="alert"` hata mesajları var
- Yayın öncesi Lighthouse hedefi: Performans ≥ 90, Erişilebilirlik ≥ 95, SEO ≥ 95

---

## 🔒 Gizlilik yaklaşımı

Zorunlu olmayan hiçbir üçüncü taraf içeriği onay alınmadan yüklenmez:

- **Google Maps** → "Haritayı yükle" düğmesine basılmadan yüklenmez
- **Google Analytics** → yalnızca çerez bildiriminde "Tümünü kabul et" seçilirse yüklenir
- **Calendly** → varsayılan olarak doğrudan yüklenir. Randevu takvimi, ziyaretçinin
  o bölüme gelme amacının kendisi olduğu için analitik gibi ikincil bir izleme
  aracından ayrı değerlendirildi. Ziyaretçi çerez bildiriminde açıkça
  **"Yalnızca zorunlu çerezler"** derse takvim yüklenmez; yerine gerekçesiyle
  birlikte "Randevu takvimini yükle" düğmesi gösterilir.

Tercih `localStorage` içinde `bk-consent-v1` anahtarıyla saklanır; ziyaretçi
sayfa altındaki "Çerez tercihlerini değiştir" bağlantısıyla kararını değiştirebilir.
