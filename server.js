/* ============================================================================
   Site sunucusu + yönetim paneli API'si
   - Statik siteyi olduğu gibi servis eder
   - index.html / blog.html içindeki blog kartlarını veritabanından doldurur
   - /blog/<slug>.html adreslerini veritabanındaki yazıdan üretir
   - /api/contact : iletişim formu mesajlarını kaydeder (+ Web3Forms'a iletir)
   - /api/admin/* : panel API'si (parola korumalı)
   - /admin       : yönetim paneli

   Çalıştırma:  npm install  →  npm start   (varsayılan port 3000, PORT ile değişir)
   Veriler:     data/  (git'e girmez)   Yüklenen görseller: uploads/
   ========================================================================== */
"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");

const { Collection, newId } = require("./lib/store");
const auth = require("./lib/auth");
const render = require("./lib/render");
const { importLegacyPosts } = require("./lib/importLegacy");

const ROOT = __dirname;
/* DATA_DIR / UPLOAD_DIR ortam değişkenleriyle başka klasöre taşınabilir
   (ör. kalıcı disk ya da test ortamı) */
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || "data");
const UPLOAD_DIR = path.resolve(ROOT, process.env.UPLOAD_DIR || "uploads");
const PORT = parseInt(process.env.PORT, 10) || 3000;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------------------------------------------------------------------------
   config.js'ten site ayarlarını oku (tek yapılandırma noktası aynı kalsın)
   ------------------------------------------------------------------------- */
function readSiteConfig() {
  const cfg = { siteUrl: "https://www.bariskarahuseyin.com", web3formsAccessKey: "", formRecipient: "" };
  try {
    const src = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
    ["siteUrl", "web3formsAccessKey", "formRecipient", "publicEmail"].forEach(function (key) {
      const m = new RegExp(key + '\\s*:\\s*"([^"]*)"').exec(src);
      if (m) cfg[key] = m[1];
    });
  } catch (_) {}
  cfg.siteUrl = (cfg.siteUrl || "").replace(/\/$/, "");
  return cfg;
}

/* ---------------------------------------------------------------------------
   Veri
   ------------------------------------------------------------------------- */
const SECRET = auth.loadSecret(DATA_DIR);
const adminStore = new Collection(DATA_DIR, "admin", { passwordHash: "", createdAt: "" });
const messagesStore = new Collection(DATA_DIR, "messages", { items: [] });
const postsStore = new Collection(DATA_DIR, "posts", null);

if (!postsStore.data || !Array.isArray(postsStore.data.items)) {
  const imported = importLegacyPosts(ROOT, newId);
  postsStore.data = { items: imported };
  postsStore.save();
  if (imported.length) console.log("[import] " + imported.length + " mevcut blog yazısı panele aktarıldı.");
}

function publishedPosts() {
  return postsStore.data.items
    .filter(function (p) { return p.status === "published"; })
    .sort(function (a, b) { return (b.datePublished || "").localeCompare(a.datePublished || ""); });
}

/* ---------------------------------------------------------------------------
   Yardımcılar
   ------------------------------------------------------------------------- */
const TR_MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u" };
function slugify(s) {
  return String(s || "")
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, function (c) { return TR_MAP[c]; })
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function str(v, max) {
  if (v == null) return "";
  return String(v).slice(0, max || 10000);
}

function clientIp(req) {
  return (req.ip || req.socket.remoteAddress || "").toString();
}

/* Basit istek sınırlayıcı (bellek içi) */
function makeLimiter(max, windowMs) {
  const hits = new Map();
  return function (key) {
    const now = Date.now();
    const list = (hits.get(key) || []).filter(function (t) { return now - t < windowMs; });
    if (list.length >= max) {
      hits.set(key, list);
      return false;
    }
    list.push(now);
    hits.set(key, list);
    return true;
  };
}
const contactLimiter = makeLimiter(5, 10 * 60 * 1000);

/* ---------------------------------------------------------------------------
   Uygulama
   ------------------------------------------------------------------------- */
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));

app.use(function (req, res, next) {
  req.cookies = auth.parseCookies(req.headers.cookie);
  const session = auth.verify(req.cookies[auth.SESSION_COOKIE], SECRET);
  req.isAdmin = !!(session && adminStore.data.passwordHash && session.v === adminStore.data.createdAt);
  next();
});

/* Özel klasörler asla dışarı açılmaz: data/, lib/, node_modules/, nokta ile
   başlayan her şey (.git, .tmp-*, .env…) ve sunucu dosyaları. DATA_DIR site
   kökünün altındaysa o klasör de kapatılır. */
const blockedDirs = ["data", "lib", "node_modules"];
const relData = path.relative(ROOT, DATA_DIR).split(path.sep).join("/");
if (relData && !relData.startsWith("..") && !path.isAbsolute(relData)) blockedDirs.push(relData);

app.use(function (req, res, next) {
  let p;
  try { p = decodeURIComponent(req.path); } catch (_) { return res.status(400).type("text").send("Geçersiz adres"); }
  const segs = p.split("/").filter(Boolean);
  const hidden =
    segs.some(function (s) { return s.charAt(0) === "."; }) ||
    blockedDirs.some(function (d) { return p === "/" + d || p.indexOf("/" + d + "/") === 0; }) ||
    /^\/(server\.js|package(-lock)?\.json)$/.test(p);
  if (hidden) return res.status(404).type("text").send("Bulunamadı");
  next();
});

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(401).json({ error: "Oturum gerekli." });
  next();
}

function setSessionCookie(req, res) {
  const token = auth.sign({ exp: Date.now() + auth.SESSION_TTL_MS, v: adminStore.data.createdAt }, SECRET);
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader(
    "Set-Cookie",
    auth.SESSION_COOKIE + "=" + encodeURIComponent(token) +
      "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + Math.floor(auth.SESSION_TTL_MS / 1000) +
      (secure ? "; Secure" : "")
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", auth.SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

/* ---------------------------------------------------------------------------
   Sayfalar: blog kartlarını enjekte ederek servis et
   ------------------------------------------------------------------------- */
function sendInjected(res, file, transform) {
  fs.readFile(path.join(ROOT, file), "utf8", function (err, html) {
    if (err) return res.status(404).type("text").send("Bulunamadı");
    res.type("html").send(transform(html));
  });
}

app.get(["/", "/index.html"], function (req, res) {
  sendInjected(res, "index.html", function (html) { return render.injectHome(html, publishedPosts()); });
});

app.get("/blog.html", function (req, res) {
  const cfg = readSiteConfig();
  sendInjected(res, "blog.html", function (html) { return render.injectBlogList(html, publishedPosts(), cfg.siteUrl); });
});

app.get("/sitemap.xml", function (req, res) {
  const cfg = readSiteConfig();
  res.type("application/xml").send(render.sitemapXml(publishedPosts(), cfg.siteUrl, "2026-09-04"));
});

app.get(["/blog/:slug.html", "/blog/:slug"], function (req, res, next) {
  const slug = req.params.slug;
  const post = postsStore.data.items.find(function (p) { return p.slug === slug; });
  if (!post) return next();
  const preview = req.query.preview === "1" && req.isAdmin;
  if (post.status !== "published" && !preview) return next();
  const cfg = readSiteConfig();
  res.type("html").send(render.postPageHtml(post, publishedPosts(), cfg, { preview: preview }));
});

/* ---------------------------------------------------------------------------
   İletişim formu
   ------------------------------------------------------------------------- */
app.post("/api/contact", function (req, res) {
  const b = req.body || {};
  if (b._gotcha) return res.json({ ok: true }); // bot: sessizce yut

  const name = str(b.name, 120).trim();
  const phone = str(b.phone, 40).trim();
  const email = str(b.email, 160).trim();
  const message = str(b.message, 4000).trim();

  if (name.length < 3) return res.status(400).json({ error: "Ad soyad eksik." });
  if (phone.replace(/\D/g, "").length < 10) return res.status(400).json({ error: "Telefon eksik." });
  if (message.length < 10) return res.status(400).json({ error: "Mesaj çok kısa." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: "E-posta geçersiz." });
  if (!b.consent) return res.status(400).json({ error: "KVKK onayı gerekli." });
  if (!contactLimiter(clientIp(req))) return res.status(429).json({ error: "Çok sık deneme. Lütfen biraz sonra tekrar deneyin." });

  const item = {
    id: newId(),
    name: name,
    phone: phone,
    email: email,
    message: message,
    consent: true,
    status: "new",
    note: "",
    createdAt: new Date().toISOString()
  };
  messagesStore.data.items.unshift(item);
  messagesStore.save();
  res.json({ ok: true });

  /* E-posta bildirimi (varsa Web3Forms anahtarı) — yanıtı bekletmez */
  const cfg = readSiteConfig();
  if (cfg.web3formsAccessKey && typeof fetch === "function") {
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: cfg.web3formsAccessKey,
        subject: "Web sitesi iletişim formu — " + name,
        from_name: cfg.siteUrl.replace(/^https?:\/\//, ""),
        replyto: email || "",
        "Ad Soyad": name,
        Telefon: phone,
        "E-posta": email || "-",
        Mesaj: message,
        "KVKK Onayı": "Aydınlatma metni okundu, açık rıza verildi.",
        Panel: cfg.siteUrl + "/admin/#/mesajlar/" + item.id
      })
    }).catch(function (err) {
      console.error("[contact] e-posta iletilemedi: " + err.message);
    });
  }
});

/* ---------------------------------------------------------------------------
   Yönetici: kurulum / giriş
   ------------------------------------------------------------------------- */
app.get("/api/admin/status", function (req, res) {
  res.json({ configured: !!adminStore.data.passwordHash, authenticated: req.isAdmin });
});

app.post("/api/admin/setup", function (req, res) {
  if (adminStore.data.passwordHash) return res.status(403).json({ error: "Yönetici zaten tanımlı." });
  const pw = str((req.body || {}).password, 200);
  if (pw.length < 8) return res.status(400).json({ error: "Parola en az 8 karakter olmalı." });
  adminStore.data.passwordHash = auth.hashPassword(pw);
  adminStore.data.createdAt = new Date().toISOString();
  adminStore.save();
  setSessionCookie(req, res);
  res.json({ ok: true });
});

app.post("/api/admin/login", function (req, res) {
  const ip = clientIp(req);
  const wait = auth.loginThrottle(ip);
  if (wait) return res.status(429).json({ error: "Çok fazla hatalı deneme. " + wait + " saniye sonra tekrar deneyin." });
  if (!adminStore.data.passwordHash) return res.status(400).json({ error: "Önce kurulum yapılmalı." });
  const pw = str((req.body || {}).password, 200);
  if (!auth.verifyPassword(pw, adminStore.data.passwordHash)) {
    auth.loginFailed(ip);
    return res.status(401).json({ error: "Parola hatalı." });
  }
  auth.loginSucceeded(ip);
  setSessionCookie(req, res);
  res.json({ ok: true });
});

app.post("/api/admin/logout", function (req, res) {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/admin/password", requireAdmin, function (req, res) {
  const b = req.body || {};
  if (!auth.verifyPassword(str(b.current, 200), adminStore.data.passwordHash)) {
    return res.status(400).json({ error: "Mevcut parola hatalı." });
  }
  const pw = str(b.password, 200);
  if (pw.length < 8) return res.status(400).json({ error: "Yeni parola en az 8 karakter olmalı." });
  adminStore.data.passwordHash = auth.hashPassword(pw);
  adminStore.data.createdAt = new Date().toISOString(); // eski oturumları geçersiz kılar
  adminStore.save();
  setSessionCookie(req, res);
  res.json({ ok: true });
});

/* ---------------------------------------------------------------------------
   Yönetici: genel bakış
   ------------------------------------------------------------------------- */
app.get("/api/admin/overview", requireAdmin, function (req, res) {
  const msgs = messagesStore.data.items;
  const posts = postsStore.data.items;
  const cfg = readSiteConfig();
  res.json({
    messages: {
      total: msgs.length,
      new: msgs.filter(function (m) { return m.status === "new"; }).length,
      latest: msgs.slice(0, 5)
    },
    posts: {
      total: posts.length,
      published: posts.filter(function (p) { return p.status === "published"; }).length,
      drafts: posts.filter(function (p) { return p.status !== "published"; }).length,
      latest: posts
        .slice()
        .sort(function (a, b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); })
        .slice(0, 5)
        .map(summarizePost)
    },
    siteUrl: cfg.siteUrl,
    emailForwarding: !!cfg.web3formsAccessKey
  });
});

/* ---------------------------------------------------------------------------
   Yönetici: mesajlar
   ------------------------------------------------------------------------- */
const MESSAGE_STATUSES = ["new", "read", "replied", "archived"];

app.get("/api/admin/messages", requireAdmin, function (req, res) {
  res.json({ items: messagesStore.data.items });
});

app.patch("/api/admin/messages/:id", requireAdmin, function (req, res) {
  const m = messagesStore.data.items.find(function (x) { return x.id === req.params.id; });
  if (!m) return res.status(404).json({ error: "Mesaj bulunamadı." });
  const b = req.body || {};
  if (b.status !== undefined) {
    if (!MESSAGE_STATUSES.includes(b.status)) return res.status(400).json({ error: "Geçersiz durum." });
    m.status = b.status;
  }
  if (b.note !== undefined) m.note = str(b.note, 2000);
  m.updatedAt = new Date().toISOString();
  messagesStore.save();
  res.json({ item: m });
});

app.delete("/api/admin/messages/:id", requireAdmin, function (req, res) {
  const before = messagesStore.data.items.length;
  messagesStore.data.items = messagesStore.data.items.filter(function (x) { return x.id !== req.params.id; });
  if (messagesStore.data.items.length === before) return res.status(404).json({ error: "Mesaj bulunamadı." });
  messagesStore.save();
  res.json({ ok: true });
});

/* ---------------------------------------------------------------------------
   Yönetici: yazılar
   ------------------------------------------------------------------------- */
function summarizePost(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    status: p.status,
    datePublished: p.datePublished,
    updatedAt: p.updatedAt,
    coverImage: p.coverImage,
    coverStyle: p.coverStyle,
    readingTime: render.readingMinutes(p),
    legacyFile: p.legacyFile || ""
  };
}

function uniqueSlug(base, excludeId) {
  let slug = base || "yazi";
  let n = 2;
  while (
    postsStore.data.items.some(function (p) { return p.slug === slug && p.id !== excludeId; })
  ) {
    slug = base + "-" + n++;
  }
  return slug;
}

function applyPostFields(target, b, isNew) {
  const now = new Date().toISOString();
  target.title = str(b.title, 200).trim();
  target.category = str(b.category, 60).trim();
  target.excerpt = str(b.excerpt, 400).trim();
  target.description = str(b.description, 320).trim();
  target.keywords = str(b.keywords, 400).trim();
  target.lead = str(b.lead, 1500).trim();
  target.content = str(b.content, 400000);
  target.faq = Array.isArray(b.faq)
    ? b.faq
        .map(function (f) { return { q: str(f && f.q, 300).trim(), a: str(f && f.a, 1500).trim() }; })
        .filter(function (f) { return f.q && f.a; })
        .slice(0, 12)
    : [];
  target.ctaTitle = str(b.ctaTitle, 160).trim();
  target.ctaText = str(b.ctaText, 400).trim();
  target.breadcrumb = str(b.breadcrumb, 80).trim();
  target.coverImage = str(b.coverImage, 300).trim().replace(/^\//, "");
  target.coverAlt = str(b.coverAlt, 200).trim();
  target.coverStyle = [1, 2, 3, 4].includes(Number(b.coverStyle)) ? Number(b.coverStyle) : target.coverStyle || 1;
  target.readingTime = Math.max(0, Math.min(120, parseInt(b.readingTime, 10) || 0));
  target.status = b.status === "published" ? "published" : "draft";

  const requestedSlug = slugify(b.slug || target.title);
  target.slug = uniqueSlug(requestedSlug || "yazi", target.id);

  const date = render.dateOnly(b.datePublished);
  if (date) target.datePublished = date;
  else if (!target.datePublished && target.status === "published") target.datePublished = now.slice(0, 10);
  else if (!target.datePublished) target.datePublished = now.slice(0, 10);

  target.dateModified = now.slice(0, 10);
  target.updatedAt = now;
  if (isNew) target.createdAt = now;
}

app.get("/api/admin/posts", requireAdmin, function (req, res) {
  const items = postsStore.data.items
    .slice()
    .sort(function (a, b) { return (b.datePublished || "").localeCompare(a.datePublished || "") || (b.updatedAt || "").localeCompare(a.updatedAt || ""); })
    .map(summarizePost);
  res.json({ items: items });
});

app.get("/api/admin/posts/:id", requireAdmin, function (req, res) {
  const p = postsStore.data.items.find(function (x) { return x.id === req.params.id; });
  if (!p) return res.status(404).json({ error: "Yazı bulunamadı." });
  res.json({ item: p });
});

app.post("/api/admin/posts", requireAdmin, function (req, res) {
  const b = req.body || {};
  if (!str(b.title).trim()) return res.status(400).json({ error: "Başlık gerekli." });
  const p = { id: newId() };
  applyPostFields(p, b, true);
  postsStore.data.items.unshift(p);
  postsStore.save();
  res.json({ item: p });
});

app.put("/api/admin/posts/:id", requireAdmin, function (req, res) {
  const p = postsStore.data.items.find(function (x) { return x.id === req.params.id; });
  if (!p) return res.status(404).json({ error: "Yazı bulunamadı." });
  const b = req.body || {};
  if (!str(b.title).trim()) return res.status(400).json({ error: "Başlık gerekli." });
  applyPostFields(p, b, false);
  postsStore.save();
  res.json({ item: p });
});

app.delete("/api/admin/posts/:id", requireAdmin, function (req, res) {
  const before = postsStore.data.items.length;
  postsStore.data.items = postsStore.data.items.filter(function (x) { return x.id !== req.params.id; });
  if (postsStore.data.items.length === before) return res.status(404).json({ error: "Yazı bulunamadı." });
  postsStore.save();
  res.json({ ok: true });
});

/* Görsel yükleme: gövde ham dosya, adı X-File-Name başlığında */
const IMAGE_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
app.post(
  "/api/admin/upload",
  requireAdmin,
  express.raw({ type: Object.keys(IMAGE_TYPES), limit: "8mb" }),
  function (req, res) {
    const ext = IMAGE_TYPES[(req.headers["content-type"] || "").split(";")[0]];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: "Yalnızca JPEG, PNG, WebP veya GIF yüklenebilir (en çok 8 MB)." });
    }
    const original = decodeURIComponent(str(req.headers["x-file-name"], 200) || "gorsel");
    const base = slugify(original.replace(/\.[a-z0-9]+$/i, "")) || "gorsel";
    const name = new Date().toISOString().slice(0, 10) + "-" + base + "-" + newId().slice(-5) + ext;
    fs.writeFile(path.join(UPLOAD_DIR, name), req.body, function (err) {
      if (err) return res.status(500).json({ error: "Dosya kaydedilemedi." });
      res.json({ url: "uploads/" + name });
    });
  }
);

app.get("/api/admin/uploads", requireAdmin, function (req, res) {
  fs.readdir(UPLOAD_DIR, function (err, files) {
    if (err) return res.json({ items: [] });
    res.json({
      items: files
        .filter(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f); })
        .sort()
        .reverse()
        .map(function (f) { return "uploads/" + f; })
    });
  });
});

/* ---------------------------------------------------------------------------
   Panel ve statik dosyalar
   ------------------------------------------------------------------------- */
app.use("/admin", express.static(path.join(ROOT, "admin"), { index: "index.html", extensions: ["html"] }));
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", immutable: true }));
app.use(express.static(ROOT, { index: false, extensions: ["html"] }));

app.use(function (req, res) {
  res.status(404).type("html").send(
    '<!doctype html><meta charset="utf-8"><title>Sayfa bulunamadı</title>' +
      '<style>body{font-family:Inter,system-ui,sans-serif;background:#f6f3ff;color:#1f2430;display:grid;place-items:center;min-height:100vh;margin:0}main{text-align:center}a{color:#5b47a8}</style>' +
      "<main><h1>Sayfa bulunamadı</h1><p>Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p><p><a href=\"/\">Ana sayfaya dön</a></p></main>"
  );
});

app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err && err.type === "entity.too.large") return res.status(413).json({ error: "Dosya çok büyük." });
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ error: "Geçersiz istek." });
  console.error(err);
  res.status(500).json({ error: "Sunucu hatası." });
});

app.listen(PORT, function () {
  console.log("Site:  http://localhost:" + PORT);
  console.log("Panel: http://localhost:" + PORT + "/admin/");
  if (!adminStore.data.passwordHash) console.log("İlk kurulum: panel adresini açıp yönetici parolası belirleyin.");
});
