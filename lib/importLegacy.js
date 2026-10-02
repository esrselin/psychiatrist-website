/* blog/ altındaki elle yazılmış HTML yazıları ilk çalıştırmada posts koleksiyonuna aktarır.
   Dosyalar silinmez; sunucu aynı URL'de artık veritabanındaki sürümü gösterir. */
"use strict";

const fs = require("fs");
const path = require("path");

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(re, html) {
  const m = re.exec(html);
  return m ? m[1] : "";
}

/* `<div class="article-body">` içeriğini, iç içe div'leri sayarak alır */
function extractBody(html) {
  const openTag = '<div class="article-body">';
  const start = html.indexOf(openTag);
  if (start < 0) return "";
  let i = start + openTag.length;
  let depth = 1;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      return dedent(html.slice(i, m.index));
    }
  }
  return "";
}

/* Satır başlarındaki ortak girintiyi kaldır (editörde temiz görünsün) */
function dedent(s) {
  const lines = s.replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
  let min = Infinity;
  lines.forEach(function (l) {
    if (!l.trim()) return;
    const n = /^ */.exec(l)[0].length;
    if (n < min) min = n;
  });
  if (!isFinite(min)) min = 0;
  return lines.map(function (l) { return l.slice(min); }).join("\n");
}

function extractFaq(html) {
  const out = [];
  const re = /<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ q: decode(m[1]), a: decode(m[2]) });
  }
  return out;
}

function parseFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const slug = path.basename(file, ".html");

  const title = decode(pick(/<h1>([\s\S]*?)<\/h1>/, html));
  if (!title) return null;

  const category = decode(pick(/<span class="blog-pill">([\s\S]*?)<\/span>/, html));
  const datePublished = pick(/<time datetime="(\d{4}-\d{2}-\d{2})"/, html);
  const readingTime = parseInt(pick(/(\d+)\s*dk okuma/, html), 10) || 0;
  const description = decode(pick(/<meta name="description" content="([^"]*)"/, html));
  const ogDescription = decode(pick(/<meta property="og:description" content="([^"]*)"/, html));
  const keywords = decode(pick(/"keywords":\s*"([^"]*)"/, html));
  const dateModified = pick(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/, html) || datePublished;
  const lead = decode(pick(/<p class="article-lead">([\s\S]*?)<\/p>/, html));
  const breadcrumb = decode(
    pick(/<nav class="breadcrumb"[^>]*>[\s\S]*?<\/a><span aria-hidden="true">›<\/span>([^<\n]+)\s*<\/nav>/, html)
  );
  const ctaBlock = pick(/<section class="article-cta">([\s\S]*?)<\/section>/, html);
  const ctaTitle = decode(pick(/<h2>([\s\S]*?)<\/h2>/, ctaBlock));
  const ctaText = decode(pick(/<p>([\s\S]*?)<\/p>/, ctaBlock));

  return {
    slug: slug,
    title: title,
    category: category,
    excerpt: ogDescription || description,
    description: description,
    keywords: keywords,
    lead: lead,
    content: extractBody(html),
    faq: extractFaq(html),
    ctaTitle: ctaTitle,
    ctaText: ctaText,
    breadcrumb: breadcrumb && breadcrumb !== title ? breadcrumb : "",
    readingTime: readingTime,
    datePublished: datePublished,
    dateModified: dateModified,
    legacyFile: "blog/" + slug + ".html"
  };
}

/* blog.html'deki kart özetleri daha kısa; varsa onları tercih et, kapak stilini al */
function cardOverrides(root) {
  const map = {};
  let html = "";
  try { html = fs.readFileSync(path.join(root, "blog.html"), "utf8"); } catch (_) { return map; }
  const re = /<a class="blog-card" href="blog\/([^"]+)\.html">\s*<div class="blog-cover blog-cover-(\d)"[\s\S]*?<p>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    map[m[1]] = { coverStyle: parseInt(m[2], 10), excerpt: decode(m[3]) };
  }
  return map;
}

function importLegacyPosts(root, newId) {
  const dir = path.join(root, "blog");
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(function (f) { return /\.html$/i.test(f); });
  } catch (_) {
    return [];
  }
  const overrides = cardOverrides(root);
  const posts = [];
  files.forEach(function (f) {
    try {
      const p = parseFile(path.join(dir, f));
      if (!p) return;
      const o = overrides[p.slug] || {};
      const now = new Date().toISOString();
      posts.push(
        Object.assign(
          {
            id: newId(),
            status: "published",
            coverImage: "",
            coverAlt: "",
            coverStyle: o.coverStyle || ((posts.length % 4) + 1),
            createdAt: now,
            updatedAt: now
          },
          p,
          o.excerpt ? { excerpt: o.excerpt } : {}
        )
      );
    } catch (err) {
      console.error("[import] " + f + " aktarılamadı: " + err.message);
    }
  });
  posts.sort(function (a, b) { return (b.datePublished || "").localeCompare(a.datePublished || ""); });
  return posts;
}

module.exports = { importLegacyPosts };
