/* Yönetici kimlik doğrulama: scrypt ile parola özeti, HMAC imzalı oturum çerezi. */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SESSION_COOKIE = "bk_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 gün

function loadSecret(dataDir) {
  const file = path.join(dataDir, "secret.key");
  try {
    const s = fs.readFileSync(file, "utf8").trim();
    if (s.length >= 32) return s;
  } catch (_) {}
  const secret = crypto.randomBytes(48).toString("base64url");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, secret, { encoding: "utf8", mode: 0o600 });
  return secret;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password.normalize("NFKC"), salt, 64);
  return "scrypt$" + salt.toString("base64url") + "$" + hash.toString("base64url");
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  const actual = crypto.scryptSync(password.normalize("NFKC"), salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + sig;
}

function verify(token, secret) {
  if (!token || typeof token !== "string") return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach(function (part) {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

/* Basit deneme sınırlayıcı: aynı IP'den 6 hatalı girişten sonra 10 dk bekleme */
const attempts = new Map();
function loginThrottle(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, until: 0 };
  if (rec.until > now) return Math.ceil((rec.until - now) / 1000);
  return 0;
}
function loginFailed(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= 6) {
    rec.until = now + 10 * 60 * 1000;
    rec.count = 0;
  }
  attempts.set(ip, rec);
}
function loginSucceeded(ip) {
  attempts.delete(ip);
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  loadSecret,
  hashPassword,
  verifyPassword,
  sign,
  verify,
  parseCookies,
  loginThrottle,
  loginFailed,
  loginSucceeded
};
