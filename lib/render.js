/* Blog kartları, yazı sayfası şablonu, liste sayfalarına enjeksiyon, sitemap. */
"use strict";

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTr(iso) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return parseInt(m[3], 10) + " " + AYLAR[parseInt(m[2], 10) - 1] + " " + m[1];
}

function dateOnly(iso) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso || "");
  return m ? m[1] : "";
}

function stripTags(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(html) {
  const t = stripTags(html);
  return t ? t.split(" ").length : 0;
}

function readingMinutes(post) {
  if (post.readingTime && Number(post.readingTime) > 0) return Number(post.readingTime);
  const words = wordCount(post.lead) + wordCount(post.content);
  return Math.max(1, Math.round(words / 200));
}

function postUrlPath(post) {
  return "blog/" + post.slug + ".html";
}

function coverHtml(post, rel) {
  if (post.coverImage) {
    return (
      '<div class="blog-cover blog-cover-img" aria-hidden="true">' +
      '<img src="' + esc(rel + post.coverImage.replace(/^\//, "")) + '" alt="" loading="lazy" decoding="async" />' +
      "</div>"
    );
  }
  const style = [1, 2, 3, 4].includes(Number(post.coverStyle)) ? Number(post.coverStyle) : 1;
  return '<div class="blog-cover blog-cover-' + style + '" aria-hidden="true"></div>';
}

/* rel: sayfanın kök dizine göre öneki ("" ana sayfa/blog.html, "../" yazı sayfaları) */
function cardHtml(post, rel, extraClass) {
  const minutes = readingMinutes(post);
  const date = dateOnly(post.datePublished);
  return (
    '<a class="blog-card' + (extraClass ? " " + extraClass : "") + '" href="' + esc(rel + postUrlPath(post)) + '">\n' +
    "  " + coverHtml(post, rel) + "\n" +
    '  <div class="blog-body">\n' +
    (post.category ? '    <span class="blog-pill">' + esc(post.category) + "</span>\n" : "") +
    "    <h3>" + esc(post.title) + "</h3>\n" +
    "    <p>" + esc(post.excerpt) + "</p>\n" +
    '    <div class="blog-meta">\n' +
    '      <time datetime="' + esc(date) + '">' + esc(formatDateTr(date)) + "</time>\n" +
    '      <span aria-hidden="true">·</span><span>' + minutes + " dk okuma</span>\n" +
    "    </div>\n" +
    '    <span class="blog-more">Yazıyı oku →</span>\n' +
    "  </div>\n" +
    "</a>"
  );
}

function injectBetween(html, startMark, endMark, replacement) {
  const s = html.indexOf(startMark);
  const e = html.indexOf(endMark);
  if (s < 0 || e < 0 || e < s) return html;
  return html.slice(0, s + startMark.length) + "\n" + replacement + "\n" + html.slice(e);
}

/* index.html: en yeni 3 yazı (reveal animasyon sınıflarıyla) */
function injectHome(html, posts) {
  const latest = posts.slice(0, 3);
  const cards = latest
    .map(function (p, i) {
      return cardHtml(p, "", "reveal" + (i ? " delay-" + i : ""));
    })
    .join("\n\n");
  return injectBetween(html, "<!-- BLOG:START -->", "<!-- BLOG:END -->", cards);
}

/* blog.html: tüm yazılar + güncel JSON-LD */
function injectBlogList(html, posts, siteUrl) {
  const cards = posts.length
    ? posts.map(function (p) { return cardHtml(p, "", ""); }).join("\n\n")
    : '<p class="section-subtext" style="grid-column: 1 / -1; text-align:center;">Henüz yayınlanmış yazı yok.</p>';
  let out = injectBetween(html, "<!-- BLOG:START -->", "<!-- BLOG:END -->", cards);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": siteUrl + "/blog.html",
    name: "Uzm. Psk. Barış Karahüseyin Blog",
    description: "Kaygı, ilişkiler, travma, EMDR ve online terapi üzerine psikoloji yazıları.",
    inLanguage: "tr-TR",
    author: {
      "@type": "Person",
      name: "Barış Karahüseyin",
      honorificPrefix: "Uzm. Psk.",
      jobTitle: "Klinik Psikolog & Psikoterapist"
    },
    blogPost: posts.map(function (p) {
      return {
        "@type": "BlogPosting",
        headline: p.title,
        url: siteUrl + "/" + postUrlPath(p),
        datePublished: dateOnly(p.datePublished)
      };
    })
  };
  out = injectBetween(
    out,
    "<!-- LD:START -->",
    "<!-- LD:END -->",
    '  <script type="application/ld+json">\n  ' + JSON.stringify(ld, null, 2).replace(/\n/g, "\n  ") + "\n  </script>"
  );
  return out;
}

function faqHtml(faq) {
  if (!faq || !faq.length) return "";
  return (
    '      <section class="article-faq" aria-labelledby="faqHead">\n' +
    '        <h2 id="faqHead">Sık sorulanlar</h2>\n' +
    faq
      .map(function (f) {
        return (
          "        <details>\n" +
          "          <summary>" + esc(f.q) + "</summary>\n" +
          "          <p>" + esc(f.a) + "</p>\n" +
          "        </details>"
        );
      })
      .join("\n") +
    "\n      </section>\n"
  );
}

function relatedHtml(post, allPosts) {
  const others = allPosts.filter(function (p) { return p.slug !== post.slug; });
  if (!others.length) return "";
  const same = others.filter(function (p) { return p.category && p.category === post.category; });
  const rest = others.filter(function (p) { return !same.includes(p); });
  const pick = same.concat(rest).slice(0, 2);
  return (
    '      <section class="related">\n' +
    "        <h2>Bunlar da ilginizi çekebilir</h2>\n" +
    '        <div class="related-list">\n' +
    pick
      .map(function (p) {
        return '          <a href="' + esc(p.slug + ".html") + '">' + esc(p.title) + "</a>";
      })
      .join("\n") +
    "\n        </div>\n" +
    "      </section>\n"
  );
}

function navHtml() {
  return [
    '  <header class="site-header" id="siteHeader">',
    '    <div class="container nav-wrap">',
    '      <a href="../index.html" class="logo" aria-label="Barış Karahüseyin, anasayfa">',
    '        <span class="logo-dot" aria-hidden="true"></span>',
    '        <span class="logo-text">Barış Karahüseyin</span>',
    "      </a>",
    '      <nav class="desktop-nav" aria-label="Ana menü">',
    '        <a href="../index.html">Anasayfa</a>',
    '        <a href="../index.html#hakkimda">Hakkımda</a>',
    '        <a href="../index.html#psikoterapi">Psikoterapi</a>',
    '        <a href="../blog.html" aria-current="page">Blog</a>',
    '        <a href="../index.html#sss">SSS</a>',
    '        <a href="../index.html#iletisim">İletişim</a>',
    "      </nav>",
    '      <div class="nav-actions">',
    '        <a href="../index.html#randevu" class="btn btn-primary">Randevu Alın</a>',
    '        <button class="hamburger" id="hamburger" type="button" aria-label="Menüyü aç" aria-expanded="false" aria-controls="mobileMenu">',
    "          <span></span><span></span><span></span>",
    "        </button>",
    "      </div>",
    "    </div>",
    '    <nav class="mobile-menu" id="mobileMenu" aria-label="Mobil menü">',
    '      <a href="../index.html">Anasayfa</a>',
    '      <a href="../index.html#hakkimda">Hakkımda</a>',
    '      <a href="../index.html#psikoterapi">Psikoterapi</a>',
    '      <a href="../blog.html" aria-current="page">Blog</a>',
    '      <a href="../index.html#sss">SSS</a>',
    '      <a href="../index.html#iletisim">İletişim</a>',
    '      <a href="../index.html#randevu" class="btn btn-primary">Randevu Alın</a>',
    "    </nav>",
    "  </header>",
    ""
  ].join("\n");
}

const WA_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>';

function footerHtml() {
  return [
    '  <footer class="site-footer">',
    '    <div class="container footer-grid">',
    "      <div>",
    "        <h3>Barış Karahüseyin</h3>",
    "        <p>Klinik Psikolog &amp; Psikoterapist</p>",
    '        <p class="footer-note">Buradaki yazılar bilgilendirme amaçlıdır; tıbbi tanı veya tedavi yerine geçmez.</p>',
    "      </div>",
    "      <div>",
    "        <h4>Menü</h4>",
    '        <a href="../index.html#hakkimda">Hakkımda</a>',
    '        <a href="../index.html#psikoterapi">Psikoterapi</a>',
    '        <a href="../index.html#calisma">Çalışma Alanlarım</a>',
    '        <a href="../blog.html">Blog</a>',
    "      </div>",
    "      <div>",
    "        <h4>İletişim</h4>",
    '        <a href="../index.html#randevu">Randevu Alın</a>',
    '        <a href="../index.html#iletisim">İletişim Formu</a>',
    '        <a href="../index.html#sss">Sıkça Sorulan Sorular</a>',
    '        <a href="#" data-link="whatsapp">WhatsApp</a>',
    "      </div>",
    "      <div>",
    "        <h4>Yasal</h4>",
    '        <a href="../kvkk-aydinlatma-metni.html">KVKK Aydınlatma Metni</a>',
    '        <a href="../gizlilik-politikasi.html">Gizlilik ve Çerez Politikası</a>',
    '        <a href="#" id="reopenConsent">Çerez tercihlerini değiştir</a>',
    "      </div>",
    "    </div>",
    '    <div class="container footer-bottom">',
    '      <span>© <span id="year">' + new Date().getFullYear() + "</span> Barış Karahüseyin</span>",
    "      <span>Tüm hakları saklıdır.</span>",
    "    </div>",
    "  </footer>",
    "",
    '  <div class="floating-actions">',
    '    <a class="fab fab-whatsapp" href="#" data-link="whatsapp" aria-label="WhatsApp üzerinden mesaj gönder">' + WA_SVG + "</a>",
    '    <button class="fab fab-top" id="backToTop" type="button" aria-label="Sayfanın başına dön">↑</button>',
    "  </div>",
    "",
    '  <div class="consent-banner" id="consentBanner" role="region" aria-label="Çerez tercihleri" hidden>',
    "    <h2>Çerez tercihleriniz</h2>",
    '    <p>Bu sitenin çalışması için zorunlu olan çerezler dışında hiçbir çerez otomatik yüklenmez. Üçüncü taraf hizmetler yalnızca onayınızla çalışır. Ayrıntı için <a href="../gizlilik-politikasi.html">Gizlilik ve Çerez Politikası</a> sayfasına bakabilirsiniz.</p>',
    '    <div class="consent-actions">',
    '      <button type="button" class="btn btn-primary" id="consentAccept">Tümünü kabul et</button>',
    '      <button type="button" class="btn btn-secondary" id="consentReject">Yalnızca zorunlu çerezler</button>',
    "    </div>",
    "  </div>",
    ""
  ].join("\n");
}

/* Tam yazı sayfası — blog/ altındaki elle yazılmış sayfalarla aynı iskelet */
function postPageHtml(post, allPublished, cfg, opts) {
  opts = opts || {};
  const siteUrl = cfg.siteUrl.replace(/\/$/, "");
  const url = siteUrl + "/" + postUrlPath(post);
  const date = dateOnly(post.datePublished);
  const modified = dateOnly(post.dateModified || post.updatedAt) || date;
  const description = post.description || post.excerpt || "";
  const ogImage = post.coverImage ? siteUrl + "/" + post.coverImage.replace(/^\//, "") : siteUrl + "/about-baris.jpeg";
  const minutes = readingMinutes(post);
  const words = wordCount(post.lead) + wordCount(post.content);
  const faq = (post.faq || []).filter(function (f) { return f && f.q && f.a; });
  const shortCrumb = post.breadcrumb || post.title;
  const isPreview = !!opts.preview;

  const graph = [
    {
      "@type": "BlogPosting",
      headline: post.title,
      description: description,
      url: url,
      datePublished: date,
      dateModified: modified,
      inLanguage: "tr-TR",
      articleSection: post.category || undefined,
      keywords: post.keywords || undefined,
      wordCount: words,
      image: ogImage,
      author: {
        "@type": "Person",
        name: "Barış Karahüseyin",
        honorificPrefix: "Uzm. Psk.",
        jobTitle: "Klinik Psikolog & Psikoterapist",
        url: siteUrl + "/"
      },
      publisher: { "@type": "Person", name: "Uzm. Psk. Barış Karahüseyin", url: siteUrl + "/" },
      mainEntityOfPage: { "@type": "WebPage", "@id": url }
    }
  ];
  if (faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map(function (f) {
        return { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } };
      })
    });
  }
  graph.push({
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Anasayfa", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: siteUrl + "/blog.html" },
      { "@type": "ListItem", position: 3, name: shortCrumb }
    ]
  });
  const ld = { "@context": "https://schema.org", "@graph": graph };

  const ctaTitle = post.ctaTitle || "Yazıdan fazlasına ihtiyacınız varsa";
  const ctaText = post.ctaText || "Buradaki yazılar genel. Kendi durumunuza bakmak isterseniz bir ilk görüşme planlayabiliriz.";

  const previewBar = isPreview
    ? '  <div class="preview-bar" role="status">Önizleme — bu yazı ' +
      (post.status === "published" ? "yayında; burada son kaydedilen hâli görünüyor" : "henüz yayınlanmadı, ziyaretçiler göremez") +
      '. <a href="../admin/#/yazilar/' + esc(post.id) + '">Düzenlemeye dön</a></div>\n'
    : "";

  const head = [
    "<!DOCTYPE html>",
    '<html lang="tr">',
    "<head>",
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "",
    "  <title>" + esc(post.title) + " | Uzm. Psk. Barış Karahüseyin</title>",
    '  <meta name="description" content="' + esc(description) + '" />',
    isPreview
      ? '  <meta name="robots" content="noindex, nofollow" />'
      : '  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />',
    '  <link rel="canonical" href="' + esc(url) + '" />',
    "",
    '  <meta property="og:type" content="article" />',
    '  <meta property="og:locale" content="tr_TR" />',
    '  <meta property="og:site_name" content="Uzm. Psk. Barış Karahüseyin" />',
    '  <meta property="og:url" content="' + esc(url) + '" />',
    '  <meta property="og:title" content="' + esc(post.title) + '" />',
    '  <meta property="og:description" content="' + esc(description) + '" />',
    '  <meta property="og:image" content="' + esc(ogImage) + '" />',
    '  <meta property="article:published_time" content="' + esc(date) + '" />',
    '  <meta name="twitter:card" content="summary_large_image" />',
    "",
    '  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />',
    '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    '  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />',
    '  <link rel="stylesheet" href="../style.css" />',
    "",
    '  <script type="application/ld+json">',
    "  " + JSON.stringify(ld, null, 2).replace(/\n/g, "\n  "),
    "  </script>",
    "</head>",
    "<body>",
    '  <a href="#main" class="skip-link">İçeriğe atla</a>',
    ""
  ].join("\n");

  const body = [
    previewBar + '  <main id="main" class="article-wrap">',
    '    <div class="page-hero">',
    '      <div class="article">',
    '        <nav class="breadcrumb" aria-label="Sayfa yolu">',
    '          <a href="../index.html">Anasayfa</a><span aria-hidden="true">›</span><a href="../blog.html">Blog</a><span aria-hidden="true">›</span>' + esc(shortCrumb),
    "        </nav>",
    "      </div>",
    "    </div>",
    "",
    '    <article class="article">',
    '      <header class="article-header">',
    post.category ? '        <span class="blog-pill">' + esc(post.category) + "</span>" : "",
    "        <h1>" + esc(post.title) + "</h1>",
    '        <div class="article-meta">',
    "          <span>Uzm. Psk. Barış Karahüseyin</span>",
    '          <span><time datetime="' + esc(date) + '">' + esc(formatDateTr(date)) + "</time></span>",
    "          <span>" + minutes + " dk okuma</span>",
    "        </div>",
    "      </header>",
    "",
    post.coverImage
      ? '      <figure class="article-cover"><img src="../' + esc(post.coverImage.replace(/^\//, "")) + '" alt="' + esc(post.coverAlt || "") + '" /></figure>\n'
      : "",
    post.lead ? '      <p class="article-lead">\n        ' + esc(post.lead) + "\n      </p>\n" : "",
    '      <div class="article-body">',
    post.content || "",
    "      </div>",
    "",
    faqHtml(faq),
    '      <section class="article-cta">',
    "        <h2>" + esc(ctaTitle) + "</h2>",
    "        <p>" + esc(ctaText) + "</p>",
    '        <div class="hero-actions">',
    '          <a href="../index.html#randevu" class="btn btn-primary btn-lg">Randevu Alın</a>',
    "        </div>",
    "      </section>",
    "",
    relatedHtml(post, allPublished),
    "    </article>",
    "  </main>",
    ""
  ].join("\n");

  const tail = [
    footerHtml(),
    '  <script src="../config.js"></script>',
    '  <script src="../script.js"></script>',
    "</body>",
    "</html>",
    ""
  ].join("\n");

  return head + navHtml() + "\n" + body + tail;
}

function sitemapXml(posts, siteUrl, staticLastmod) {
  const base = siteUrl.replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const latestPost = posts.length ? dateOnly(posts[0].dateModified || posts[0].datePublished) || today : staticLastmod;
  const rows = [
    { loc: base + "/", lastmod: staticLastmod, freq: "monthly", pri: "1.0" },
    { loc: base + "/blog.html", lastmod: latestPost, freq: "weekly", pri: "0.8" }
  ]
    .concat(
      posts.map(function (p) {
        return {
          loc: base + "/" + postUrlPath(p),
          lastmod: dateOnly(p.dateModified || p.updatedAt) || dateOnly(p.datePublished),
          freq: "yearly",
          pri: "0.7"
        };
      })
    )
    .concat([
      { loc: base + "/kvkk-aydinlatma-metni.html", lastmod: staticLastmod, freq: "yearly", pri: "0.3" },
      { loc: base + "/gizlilik-politikasi.html", lastmod: staticLastmod, freq: "yearly", pri: "0.3" }
    ]);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    rows
      .map(function (r) {
        return (
          "  <url>\n" +
          "    <loc>" + esc(r.loc) + "</loc>\n" +
          "    <lastmod>" + esc(r.lastmod) + "</lastmod>\n" +
          "    <changefreq>" + r.freq + "</changefreq>\n" +
          "    <priority>" + r.pri + "</priority>\n" +
          "  </url>"
        );
      })
      .join("\n") +
    "\n</urlset>\n"
  );
}

module.exports = {
  esc,
  formatDateTr,
  dateOnly,
  stripTags,
  readingMinutes,
  cardHtml,
  injectHome,
  injectBlogList,
  postPageHtml,
  sitemapXml
};
