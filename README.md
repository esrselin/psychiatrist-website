# Uzm. Psk. Barış Karahüseyin — Web Sitesi

Statik (build gerektirmeyen) tek sayfa + blog yapısı. HTML / CSS / vanilla JS.
Herhangi bir statik hosting'e (Netlify, Vercel, Cloudflare Pages, GitHub Pages,
cPanel) olduğu gibi yüklenebilir.

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

1. `blog/` altındaki mevcut bir yazıyı kopyalayın, yeni ada kaydedin
   (URL slug'ı Türkçe karaktersiz ve tire ile ayrılmış olsun).
2. Şunları güncelleyin: `<title>`, `meta description`, `canonical`, `og:*`,
   JSON-LD (`headline`, `url`, `datePublished`, `wordCount`, `keywords`),
   `<h1>`, tarih, içerik ve SSS bölümü.
3. Kart bloğunu `blog.html` ve — öne çıkarmak isterseniz — `index.html`
   içindeki `.blog-grid` alanına ekleyin.
4. `sitemap.xml` dosyasına `<url>` kaydı ekleyin.

**GEO (üretken arama motorları) için:** Görünür kısımda soru biçiminde `<h2>`
başlıklar ve bir SSS bölümü, sayfa kaynağında `BlogPosting` + `FAQPage`
yapısal verisi bulunsun. Sayfadaki SSS metinleriyle JSON-LD içindeki
cevapların birebir aynı olması gerekiyor.

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
- **Calendly** → "Randevu takvimini yükle" düğmesine basılmadan yüklenmez
- **Google Analytics** → yalnızca çerez bildiriminde "Tümünü kabul et" seçilirse yüklenir

Tercih `localStorage` içinde `bk-consent-v1` anahtarıyla saklanır; ziyaretçi
sayfa altındaki "Çerez tercihlerini değiştir" bağlantısıyla kararını değiştirebilir.
