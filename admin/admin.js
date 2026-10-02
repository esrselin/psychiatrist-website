/* ============================================================================
   Yönetim paneli — tek sayfa uygulama (vanilla JS, hash yönlendirme)
   Bölümler: yardımcılar · kimlik kapısı · yönlendirici · genel bakış ·
             mesajlar · yazılar · düzenleyici · ayarlar
   ========================================================================== */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var view = $("view");

  /* ------------------------------------------------------------------------
     Yardımcılar
     ---------------------------------------------------------------------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var TR_MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u" };
  function slugify(s) {
    return String(s || "")
      .replace(/[çğıöşüÇĞİIÖŞÜ]/g, function (c) { return TR_MAP[c]; })
      .toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  }

  var fmtDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  var fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

  function dateLabel(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return fmtDate.format(d);
  }

  function whenLabel(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var y = new Date(now); y.setDate(now.getDate() - 1);
    if (sameDay) return "Bugün " + fmtTime.format(d);
    if (d.toDateString() === y.toDateString()) return "Dün " + fmtTime.format(d);
    return fmtDate.format(d) + " · " + fmtTime.format(d);
  }

  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  function phoneDigits(p) {
    var d = String(p || "").replace(/\D/g, "");
    if (d.length === 10 && d[0] === "5") d = "90" + d;
    if (d.length === 11 && d[0] === "0") d = "9" + d;
    return d;
  }

  var toastTimer;
  function toast(msg, isErr) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (isErr ? " err" : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, isErr ? 4200 : 2600);
  }

  function confirmDialog(title, text, okLabel) {
    return new Promise(function (resolve) {
      var m = $("modal");
      $("modalTitle").textContent = title;
      $("modalText").textContent = text;
      $("modalOk").textContent = okLabel || "Sil";
      m.hidden = false;
      $("modalOk").focus();
      function done(v) {
        m.hidden = true;
        $("modalOk").onclick = null;
        $("modalCancel").onclick = null;
        document.removeEventListener("keydown", onKey);
        resolve(v);
      }
      function onKey(e) { if (e.key === "Escape") done(false); }
      $("modalOk").onclick = function () { done(true); };
      $("modalCancel").onclick = function () { done(false); };
      m.onclick = function (e) { if (e.target === m) done(false); };
      document.addEventListener("keydown", onKey);
    });
  }

  function api(method, url, body) {
    var opts = { method: method, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) {
          showGate("login");
          throw new Error(data.error || "Oturum süresi doldu, yeniden giriş yapın.");
        }
        if (!res.ok) throw new Error(data.error || "İşlem tamamlanamadı (" + res.status + ").");
        return data;
      });
    });
  }

  function uploadImage(file) {
    return fetch("/api/admin/upload", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
      body: file
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || "Görsel yüklenemedi.");
        return data.url;
      });
    });
  }

  function pickImage() {
    return new Promise(function (resolve) {
      var input = $("hiddenFile");
      input.value = "";
      input.onchange = function () { resolve(input.files && input.files[0] ? input.files[0] : null); };
      input.click();
    });
  }

  function setRailCount(n) {
    var b = $("railNewCount");
    b.textContent = n;
    b.hidden = !n;
    document.title = (n ? "(" + n + ") " : "") + "Yönetim Paneli · Barış Karahüseyin";
  }

  /* ------------------------------------------------------------------------
     Kimlik kapısı (ilk kurulum / giriş)
     ---------------------------------------------------------------------- */

  var gateMode = "login";

  function showGate(mode) {
    gateMode = mode;
    $("shell").hidden = true;
    $("gate").hidden = false;
    var setup = mode === "setup";
    $("gateTitle").textContent = setup ? "Yönetici parolası belirleyin" : "Panele giriş";
    $("gateText").textContent = setup
      ? "Bu panel yalnızca size ait. İlk açılış: en az 8 karakterli bir parola seçin, sonra bu parolayla giriş yapacaksınız."
      : "Danışan mesajlarını ve blog yazılarını buradan yönetirsiniz.";
    $("gateLabel").textContent = setup ? "Yeni parola" : "Parola";
    $("gateConfirmWrap").hidden = !setup;
    $("gateSubmit").textContent = setup ? "Parolayı kaydet ve gir" : "Giriş yap";
    $("gatePassword").setAttribute("autocomplete", setup ? "new-password" : "current-password");
    $("gateError").textContent = "";
    $("gatePassword").value = "";
    $("gatePassword2").value = "";
    setTimeout(function () { $("gatePassword").focus(); }, 30);
  }

  function showShell() {
    $("gate").hidden = true;
    $("shell").hidden = false;
  }

  $("gateForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("gatePassword").value;
    var err = $("gateError");
    err.textContent = "";
    if (gateMode === "setup") {
      if (pw.length < 8) { err.textContent = "Parola en az 8 karakter olmalı."; return; }
      if (pw !== $("gatePassword2").value) { err.textContent = "İki parola birbirinden farklı."; return; }
    }
    $("gateSubmit").disabled = true;
    api("POST", gateMode === "setup" ? "/api/admin/setup" : "/api/admin/login", { password: pw })
      .then(function () {
        showShell();
        route();
      })
      .catch(function (e2) { err.textContent = e2.message; })
      .then(function () { $("gateSubmit").disabled = false; });
  });

  $("logoutBtn").addEventListener("click", function () {
    api("POST", "/api/admin/logout").then(function () { showGate("login"); });
  });

  /* ------------------------------------------------------------------------
     Yönlendirici
     ---------------------------------------------------------------------- */

  var currentCleanup = null;

  function route() {
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/").filter(Boolean);
    var name = parts[0] || "";

    if (typeof currentCleanup === "function") {
      if (currentCleanup() === false) return; // kaydedilmemiş değişiklik: kullanıcı vazgeçti
      currentCleanup = null;
    }

    var routeKey = { "": "dashboard", mesajlar: "messages", yazilar: "posts", ayarlar: "settings" }[name] || "dashboard";
    document.querySelectorAll(".rail-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === routeKey);
    });

    view.innerHTML = '<div class="loading">Yükleniyor…</div>';
    window.scrollTo(0, 0);

    if (name === "mesajlar") renderMessages(parts[1] || null);
    else if (name === "yazilar" && parts[1]) renderEditor(parts[1] === "yeni" ? null : parts[1]);
    else if (name === "yazilar") renderPosts();
    else if (name === "ayarlar") renderSettings();
    else renderDashboard();
  }

  window.addEventListener("hashchange", route);

  /* ------------------------------------------------------------------------
     Genel bakış
     ---------------------------------------------------------------------- */

  function greeting() {
    var h = new Date().getHours();
    if (h < 6) return "İyi geceler";
    if (h < 12) return "Günaydın";
    if (h < 18) return "İyi günler";
    return "İyi akşamlar";
  }

  function renderDashboard() {
    api("GET", "/api/admin/overview").then(function (d) {
      setRailCount(d.messages.new);
      var newTxt = d.messages.new
        ? d.messages.new + " yeni mesaj bekliyor."
        : "Bekleyen mesaj yok.";

      view.innerHTML =
        '<div class="page-head">' +
        '  <div><div class="eyebrow">' + esc(dateLabel(new Date().toISOString())) + '</div>' +
        '  <h1 class="page-title">' + greeting() + ", Barış.</h1>" +
        "  <p>" + esc(newTxt) + "</p></div>" +
        '  <a class="btn btn-primary" href="#/yazilar/yeni">+ Yeni yazı</a>' +
        "</div>" +
        (d.emailForwarding ? "" :
          '<div class="notice">Mesajlar yalnızca bu panele düşüyor. Her mesaj için e-posta da almak isterseniz <code>config.js</code> içindeki <code>web3formsAccessKey</code> alanını doldurun.</div>') +
        '<div class="stats">' +
        statTile(d.messages.new, "Yeni mesaj", "#/mesajlar/?f=new", d.messages.new > 0) +
        statTile(d.messages.total, "Toplam mesaj", "#/mesajlar") +
        statTile(d.posts.published, "Yayında yazı", "#/yazilar") +
        statTile(d.posts.drafts, "Taslak", "#/yazilar") +
        "</div>" +
        '<div class="dash-grid">' +
        '  <section class="card card-pad"><div class="card-title">Son mesajlar <a class="btn btn-text btn-sm" href="#/mesajlar">Tümü →</a></div>' +
        (d.messages.latest.length
          ? '<ul class="list">' + d.messages.latest.map(function (m) {
              return '<li><a href="#/mesajlar/' + esc(m.id) + '"><span class="dot' + (m.status === "new" ? " on" : "") + '"></span>' +
                '<span class="t">' + esc(m.name) + '</span><span class="s">' + esc(m.message.slice(0, 60)) + '</span><span class="d">' + esc(whenLabel(m.createdAt)) + "</span></a></li>";
            }).join("") + "</ul>"
          : '<div class="empty"><strong>Henüz mesaj yok</strong>Sitedeki iletişim formundan gelen mesajlar burada görünür.</div>') +
        "  </section>" +
        '  <section class="card card-pad"><div class="card-title">Son düzenlenen yazılar <a class="btn btn-text btn-sm" href="#/yazilar">Tümü →</a></div>' +
        (d.posts.latest.length
          ? '<ul class="list">' + d.posts.latest.map(function (p) {
              return '<li><a href="#/yazilar/' + esc(p.id) + '"><span class="pill ' + (p.status === "published" ? "pill-published" : "pill-draft") + '">' + (p.status === "published" ? "Yayında" : "Taslak") + "</span>" +
                '<span class="t">' + esc(p.title) + '</span><span class="d">' + esc(dateLabel(p.updatedAt)) + "</span></a></li>";
            }).join("") + "</ul>"
          : '<div class="empty"><strong>Henüz yazı yok</strong>İlk yazınızı ekleyin.</div>') +
        "  </section>" +
        "</div>";
    }).catch(function (e) { view.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
  }

  function statTile(n, label, href, highlight) {
    return '<a class="card stat' + (highlight ? " is-new" : "") + '" href="' + href + '"><span class="n">' + n + '</span><span class="l">' + label + "</span></a>";
  }

  /* ------------------------------------------------------------------------
     Mesajlar
     ---------------------------------------------------------------------- */

  var STATUS_LABEL = { new: "Yeni", read: "Okundu", replied: "Yanıtlandı", archived: "Arşiv" };
  var msgState = { filter: "all", q: "" };

  function renderMessages(selectedId) {
    var m = /\?f=(\w+)/.exec(location.hash);
    if (m) { msgState.filter = m[1]; selectedId = null; }

    api("GET", "/api/admin/messages").then(function (d) {
      var items = d.items;
      setRailCount(items.filter(function (x) { return x.status === "new"; }).length);

      view.innerHTML =
        '<div class="page-head"><div><h1 class="page-title">Mesajlar</h1><p>İletişim formundan gelen danışan mesajları.</p></div></div>' +
        '<div class="toolbar"><div class="tabs" id="msgTabs"></div>' +
        '<label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input type="search" id="msgSearch" placeholder="İsim, telefon veya mesajda ara" value="' + esc(msgState.q) + '" aria-label="Mesajlarda ara" /></label></div>' +
        '<div class="inbox" id="inbox"><div class="card msg-list-card"><ul class="msg-list" id="msgList"></ul></div><div id="msgReader"></div></div>';

      function counts() {
        var c = { all: items.length, new: 0, read: 0, replied: 0, archived: 0 };
        items.forEach(function (x) { c[x.status] = (c[x.status] || 0) + 1; });
        return c;
      }

      function drawTabs() {
        var c = counts();
        $("msgTabs").innerHTML = [["all", "Tümü"], ["new", "Yeni"], ["read", "Okundu"], ["replied", "Yanıtlandı"], ["archived", "Arşiv"]]
          .map(function (t) {
            return '<button type="button" data-f="' + t[0] + '" class="' + (msgState.filter === t[0] ? "active" : "") + '">' + t[1] + "<b>" + c[t[0]] + "</b></button>";
          }).join("");
        $("msgTabs").querySelectorAll("button").forEach(function (b) {
          b.onclick = function () { msgState.filter = b.getAttribute("data-f"); drawTabs(); drawList(); };
        });
      }

      function filtered() {
        var q = msgState.q.trim().toLowerCase();
        return items.filter(function (x) {
          if (msgState.filter === "all" ? x.status === "archived" : x.status !== msgState.filter) return false;
          if (!q) return true;
          return (x.name + " " + x.phone + " " + x.email + " " + x.message).toLowerCase().indexOf(q) >= 0;
        });
      }

      function drawList() {
        var list = filtered();
        var ul = $("msgList");
        if (!list.length) {
          ul.innerHTML = '<li class="empty"><strong>' + (msgState.q ? "Eşleşen mesaj yok" : "Bu kutuda mesaj yok") + "</strong>" +
            (msgState.filter === "all" && !msgState.q ? "Sitedeki iletişim formundan gelen mesajlar burada görünür." : "") + "</li>";
          return;
        }
        ul.innerHTML = list.map(function (x) {
          return '<li class="msg-row' + (x.status === "new" ? " unread" : "") + (x.id === selectedId ? " active" : "") + '" data-id="' + esc(x.id) + '" tabindex="0" role="button">' +
            '<span class="avatar' + (x.status === "new" ? " lime" : "") + '">' + esc(initials(x.name)) + "</span>" +
            '<span><span class="name">' + esc(x.name) + (x.note ? ' <span class="muted small" title="Not var">✎</span>' : "") + "</span>" +
            '<span class="preview">' + esc(x.message) + "</span></span>" +
            '<span class="when">' + esc(whenLabel(x.createdAt)) + "</span></li>";
        }).join("");
        ul.querySelectorAll(".msg-row").forEach(function (row) {
          var open = function () { location.hash = "#/mesajlar/" + row.getAttribute("data-id"); };
          row.onclick = open;
          row.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
        });
      }

      function drawReader() {
        var reader = $("msgReader");
        var inbox = $("inbox");
        var x = items.find(function (i) { return i.id === selectedId; });
        inbox.classList.toggle("has-open", !!x);
        if (!x) {
          reader.innerHTML = '<div class="card empty" style="padding:70px 24px"><strong>Bir mesaj seçin</strong>Okumak için soldaki listeden bir mesaja tıklayın.</div>';
          return;
        }
        var digits = phoneDigits(x.phone);
        reader.innerHTML =
          '<article class="card letter">' +
          '<a class="back-link btn btn-text btn-sm" href="#/mesajlar">← Listeye dön</a>' +
          '<div class="letter-head"><span class="avatar' + (x.status === "new" ? " lime" : "") + '">' + esc(initials(x.name)) + "</span>" +
          "<div><h2>" + esc(x.name) + '</h2><div class="when">' + esc(whenLabel(x.createdAt)) + "</div></div>" +
          '<span class="status"><span class="pill pill-' + esc(x.status) + '">' + STATUS_LABEL[x.status] + "</span></span></div>" +
          '<div class="contact-line">' +
          '<a href="tel:+' + esc(digits) + '"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' + esc(x.phone) + "</a>" +
          (digits ? '<a class="wa" href="https://wa.me/' + esc(digits) + "?text=" + encodeURIComponent("Merhaba " + x.name.split(" ")[0] + ", web sitesi üzerinden gönderdiğiniz mesaj için teşekkürler.") + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.24 8.23z"/></svg>WhatsApp</a>' : "") +
          (x.email ? '<a href="mailto:' + esc(x.email) + "?subject=" + encodeURIComponent("Re: Web sitesi iletişim formu") + '"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>' + esc(x.email) + "</a>" : '<span class="muted small" style="align-self:center">E-posta bırakılmamış</span>') +
          '<button type="button" id="copyBtn"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Bilgileri kopyala</button>' +
          "</div>" +
          '<div class="letter-body">' + esc(x.message) + "</div>" +
          '<div class="letter-consent"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg>KVKK aydınlatma metni onaylandı, açık rıza verildi · ' + esc(dateLabel(x.createdAt)) + "</div>" +
          '<div class="letter-actions"><div class="group">' +
          (x.status !== "replied" ? '<button type="button" class="btn btn-accent btn-sm" data-st="replied">Yanıtlandı olarak işaretle</button>' : '<button type="button" class="btn btn-ghost btn-sm" data-st="read">Yanıtlandı işaretini kaldır</button>') +
          (x.status === "new" ? "" : (x.status === "archived" ? '<button type="button" class="btn btn-ghost btn-sm" data-st="read">Arşivden çıkar</button>' : '<button type="button" class="btn btn-ghost btn-sm" data-st="archived">Arşivle</button>')) +
          (x.status === "read" ? '<button type="button" class="btn btn-ghost btn-sm" data-st="new">Okunmadı yap</button>' : "") +
          '</div><button type="button" class="btn btn-text btn-sm" id="delMsg" style="color:var(--danger)">Sil</button></div>' +
          '<div class="letter-note field"><label for="msgNote">Not <span class="hint">yalnızca siz görürsünüz</span></label>' +
          '<textarea id="msgNote" rows="3" placeholder="Örn. Arandı, ilk görüşme 12 Ekim 14:00">' + esc(x.note || "") + '</textarea><div class="saved" id="noteSaved"></div></div>' +
          "</article>";

        reader.querySelectorAll("[data-st]").forEach(function (b) {
          b.onclick = function () { setStatus(x, b.getAttribute("data-st")); };
        });
        $("copyBtn").onclick = function () {
          var txt = x.name + "\n" + x.phone + (x.email ? "\n" + x.email : "") + "\n\n" + x.message;
          navigator.clipboard.writeText(txt).then(function () { toast("Kopyalandı"); }, function () { toast("Kopyalanamadı", true); });
        };
        $("delMsg").onclick = function () {
          confirmDialog("Mesaj silinsin mi?", x.name + " adlı kişinin mesajı kalıcı olarak silinir. Bu işlem geri alınamaz.", "Mesajı sil").then(function (ok) {
            if (!ok) return;
            api("DELETE", "/api/admin/messages/" + x.id).then(function () {
              items = items.filter(function (i) { return i.id !== x.id; });
              toast("Mesaj silindi");
              location.hash = "#/mesajlar";
            }).catch(function (e) { toast(e.message, true); });
          });
        };
        var noteEl = $("msgNote");
        var noteTimer;
        noteEl.oninput = function () {
          clearTimeout(noteTimer);
          $("noteSaved").textContent = "Kaydediliyor…";
          noteTimer = setTimeout(saveNote, 700);
        };
        noteEl.onblur = function () { clearTimeout(noteTimer); saveNote(); };
        function saveNote() {
          if (noteEl.value === (x.note || "")) { $("noteSaved").textContent = ""; return; }
          api("PATCH", "/api/admin/messages/" + x.id, { note: noteEl.value }).then(function (r) {
            x.note = r.item.note;
            $("noteSaved").textContent = "Not kaydedildi";
            drawList();
          }).catch(function (e) { $("noteSaved").textContent = e.message; });
        }
      }

      function setStatus(x, st) {
        api("PATCH", "/api/admin/messages/" + x.id, { status: st }).then(function (r) {
          x.status = r.item.status;
          setRailCount(items.filter(function (i) { return i.status === "new"; }).length);
          drawTabs(); drawList(); drawReader();
        }).catch(function (e) { toast(e.message, true); });
      }

      $("msgSearch").oninput = function () { msgState.q = this.value; drawList(); };

      drawTabs();
      drawList();
      drawReader();

      /* Yeni mesaj açılınca "okundu" olur */
      var sel = items.find(function (i) { return i.id === selectedId; });
      if (sel && sel.status === "new") setStatus(sel, "read");
    }).catch(function (e) { view.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
  }

  /* ------------------------------------------------------------------------
     Yazılar listesi
     ---------------------------------------------------------------------- */

  function renderPosts() {
    api("GET", "/api/admin/posts").then(function (d) {
      var items = d.items;
      view.innerHTML =
        '<div class="page-head"><div><h1 class="page-title">Blog yazıları</h1><p>' +
        items.filter(function (p) { return p.status === "published"; }).length + " yayında, " +
        items.filter(function (p) { return p.status !== "published"; }).length + " taslak.</p></div>" +
        '<a class="btn btn-primary" href="#/yazilar/yeni">+ Yeni yazı</a></div>' +
        '<div class="toolbar"><label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input type="search" id="postSearch" placeholder="Başlıkta ara" aria-label="Yazılarda ara" /></label></div>' +
        '<div class="card"><table class="table"><thead><tr><th>Yazı</th><th>Durum</th><th>Kategori</th><th>Tarih</th><th></th></tr></thead><tbody id="postRows"></tbody></table></div>';

      function draw() {
        var q = ($("postSearch").value || "").trim().toLowerCase();
        var list = q ? items.filter(function (p) { return p.title.toLowerCase().indexOf(q) >= 0; }) : items;
        var tb = $("postRows");
        if (!list.length) {
          tb.innerHTML = '<tr><td colspan="5"><div class="empty"><strong>' + (q ? "Eşleşen yazı yok" : "Henüz yazı yok") + '</strong>' + (q ? "" : '<a class="btn btn-text" href="#/yazilar/yeni">İlk yazıyı ekleyin →</a>') + "</div></td></tr>";
          return;
        }
        tb.innerHTML = list.map(function (p) {
          var thumb = p.coverImage
            ? '<span class="thumb"><img src="../' + esc(p.coverImage) + '" alt="" /></span>'
            : '<span class="thumb s' + (p.coverStyle || 1) + '"></span>';
          var isPub = p.status === "published";
          return "<tr>" +
            '<td><a class="post-cell" href="#/yazilar/' + esc(p.id) + '">' + thumb + '<span style="min-width:0"><span class="t">' + esc(p.title) + '</span><span class="slug">/blog/' + esc(p.slug) + ".html · " + p.readingTime + " dk</span></span></a></td>" +
            '<td><span class="pill ' + (isPub ? "pill-published" : "pill-draft") + '">' + (isPub ? "Yayında" : "Taslak") + "</span></td>" +
            "<td>" + (p.category ? '<span class="pill pill-cat">' + esc(p.category) + "</span>" : "") + "</td>" +
            '<td class="muted small">' + esc(dateLabel(p.datePublished)) + "</td>" +
            '<td><div class="row-actions"><a class="btn btn-text btn-sm" href="#/yazilar/' + esc(p.id) + '">Düzenle</a>' +
            '<a class="btn btn-text btn-sm" href="../blog/' + esc(p.slug) + ".html" + (isPub ? "" : "?preview=1") + '" target="_blank" rel="noopener">' + (isPub ? "Görüntüle ↗" : "Önizle ↗") + "</a></div></td></tr>";
        }).join("");
      }
      $("postSearch").oninput = draw;
      draw();
    }).catch(function (e) { view.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
  }

  /* ------------------------------------------------------------------------
     Yazı düzenleyici
     ---------------------------------------------------------------------- */

  function emptyPost() {
    return {
      id: null, title: "", slug: "", category: "", excerpt: "", description: "", keywords: "",
      lead: "", content: "", faq: [], ctaTitle: "", ctaText: "", breadcrumb: "",
      coverImage: "", coverAlt: "", coverStyle: 1, readingTime: 0, status: "draft",
      datePublished: new Date().toISOString().slice(0, 10)
    };
  }

  /* Görsel düzenleyicinin sadeleştireceği özel yapılar (kutular, içindekiler) */
  function hasRichMarkup(html) {
    return /<(div|section|aside|figure|table)\b|class="/i.test(html || "");
  }

  function renderEditor(id) {
    var load = id ? api("GET", "/api/admin/posts/" + id).then(function (d) { return d.item; }) : Promise.resolve(emptyPost());
    load.then(function (post) {
      var dirty = false;
      var slugTouched = !!post.slug;
      var mode = hasRichMarkup(post.content) ? "html" : "visual";
      var quill = null;

      view.innerHTML =
        '<div class="page-head"><div><div class="eyebrow">' + (post.id ? "Yazıyı düzenle" : "Yeni yazı") + '</div>' +
        '<a class="btn btn-text btn-sm" href="#/yazilar" style="margin-left:-10px">← Yazılara dön</a></div></div>' +
        '<div class="editor-layout"><div class="editor-main">' +
        '<section class="card card-pad">' +
        '<input class="title-input" id="pTitle" placeholder="Yazının başlığı" value="' + esc(post.title) + '" maxlength="200" />' +
        '<div class="slug-line">Adres: <span class="mono">/blog/</span><input id="pSlug" class="mono" value="' + esc(post.slug) + '" spellcheck="false" /><span class="mono">.html</span></div>' +
        '<div class="field-row">' +
        '<div class="field"><label for="pCategory">Kategori <span class="hint">kartta görünen etiket</span></label><input type="text" id="pCategory" list="catList" value="' + esc(post.category) + '" placeholder="Kaygı, İlişkiler, Travma…" /><datalist id="catList"><option>Kaygı</option><option>İlişkiler</option><option>Travma</option><option>Terapi Süreci</option><option>Depresyon</option><option>Özsaygı</option></datalist></div>' +
        '<div class="field"><label for="pBreadcrumb">Kısa ad <span class="hint">sayfa yolunda, isteğe bağlı</span></label><input type="text" id="pBreadcrumb" value="' + esc(post.breadcrumb) + '" placeholder="Örn. Sınır koymak" /></div>' +
        "</div>" +
        '<div class="field"><label for="pExcerpt">Kart özeti <span class="count" id="excerptCount"></span></label><textarea id="pExcerpt" rows="2" placeholder="Blog listesinde kartın altında görünen 1-2 cümle">' + esc(post.excerpt) + "</textarea></div>" +
        '<div class="field"><label for="pLead">Giriş paragrafı <span class="hint">yazının üstünde büyük puntoyla</span></label><textarea id="pLead" rows="3" placeholder="Okuru yazıya alan ilk paragraf">' + esc(post.lead) + "</textarea></div>" +
        "</section>" +
        '<section class="card card-pad">' +
        '<div class="editor-tabs"><div class="card-title" style="margin:0">Yazı içeriği</div><div class="tabs"><button type="button" data-mode="visual">Görsel</button><button type="button" data-mode="html">HTML</button></div></div>' +
        '<div id="richNotice" class="notice info" hidden>Bu yazı özel kutular içeriyor (ör. tanım kutusu, içindekiler). Görsel düzenleyici bunları sade paragraflara çevirir; biçimi korumak için HTML sekmesinde kalın.</div>' +
        '<div class="quill-wrap" id="quillWrap"><div id="quillEditor"></div></div>' +
        '<textarea class="html-area" id="htmlArea" spellcheck="false" hidden></textarea>' +
        "</section>" +
        '<section class="card card-pad"><div class="card-title">Sık sorulanlar <span class="hint small muted" style="font-weight:400">yazının sonunda açılır-kapanır; Google için de işlenir</span></div><div id="faqList"></div><button type="button" class="btn btn-ghost btn-sm" id="faqAdd">+ Soru ekle</button></section>' +
        '<section class="card card-pad"><div class="card-title">Yazı sonu çağrısı <span class="hint small muted" style="font-weight:400">boş bırakılırsa varsayılan metin kullanılır</span></div>' +
        '<div class="field"><label for="pCtaTitle">Başlık</label><input type="text" id="pCtaTitle" value="' + esc(post.ctaTitle) + '" placeholder="Yazıdan fazlasına ihtiyacınız varsa" /></div>' +
        '<div class="field"><label for="pCtaText">Metin</label><textarea id="pCtaText" rows="2" placeholder="Buradaki yazılar genel. Kendi durumunuza bakmak isterseniz bir ilk görüşme planlayabiliriz.">' + esc(post.ctaText) + "</textarea></div></section>" +
        "</div>" +
        '<div class="editor-side">' +
        '<section class="card card-pad"><div class="card-title">Yayın</div>' +
        '<div class="status-toggle"><button type="button" data-status="draft">Taslak</button><button type="button" data-status="published" class="pub">Yayında</button></div>' +
        '<div class="field"><label for="pDate">Yayın tarihi</label><input type="date" id="pDate" value="' + esc(post.datePublished || "") + '" /></div>' +
        '<div class="field"><label for="pReading">Okuma süresi <span class="hint">dk, boşsa otomatik</span></label><input type="number" id="pReading" min="0" max="120" value="' + (post.readingTime || "") + '" placeholder="otomatik" /></div>' +
        "</section>" +
        '<section class="card card-pad"><div class="card-title">Kapak</div>' +
        '<div class="cover-preview" id="coverPreview"></div>' +
        '<div class="cover-actions"><button type="button" class="btn btn-ghost btn-sm" id="coverUpload">Görsel yükle</button><button type="button" class="btn btn-text btn-sm" id="coverRemove" hidden>Kaldır</button></div>' +
        '<div class="field" id="coverAltWrap" style="margin-top:12px" hidden><label for="pCoverAlt">Görsel açıklaması <span class="hint">erişilebilirlik</span></label><input type="text" id="pCoverAlt" value="' + esc(post.coverAlt) + '" /></div>' +
        '<div class="small muted" style="margin-top:12px">Görsel yoksa desen:</div><div class="cover-pick" id="coverPick"></div>' +
        "</section>" +
        '<section class="card card-pad"><div class="card-title">Arama motoru</div>' +
        '<div class="field"><label for="pDescription">Meta açıklama <span class="count" id="descCount"></span></label><textarea id="pDescription" rows="3" placeholder="Boşsa kart özeti kullanılır">' + esc(post.description) + "</textarea></div>" +
        '<div class="field"><label for="pKeywords">Anahtar kelimeler <span class="hint">virgülle</span></label><input type="text" id="pKeywords" value="' + esc(post.keywords) + '" placeholder="kaygı, panik atak, nefes egzersizi" /></div>' +
        "</section>" +
        "</div></div>" +
        '<div class="actionbar"><div class="group"><span class="state" id="saveState">' + (post.id ? "Son kayıt: " + esc(whenLabel(post.updatedAt)) : "Henüz kaydedilmedi") + "</span></div>" +
        '<div class="group">' + (post.id ? '<button type="button" class="btn btn-text btn-sm" id="delPost" style="color:var(--danger)">Sil</button>' : "") +
        '<button type="button" class="btn btn-ghost" id="previewBtn">Önizle ↗</button>' +
        '<button type="button" class="btn btn-ghost" id="saveDraftBtn">Taslak olarak kaydet</button>' +
        '<button type="button" class="btn btn-primary" id="publishBtn">Yayınla</button></div></div>';

      /* --- Quill --- */
      quill = new Quill("#quillEditor", {
        theme: "snow",
        placeholder: "Yazmaya başlayın…",
        modules: {
          toolbar: {
            container: [
              [{ header: [2, 3, false] }],
              ["bold", "italic", "underline"],
              ["blockquote"],
              [{ list: "ordered" }, { list: "bullet" }],
              ["link", "image"],
              ["clean"]
            ],
            handlers: {
              image: function () {
                pickImage().then(function (file) {
                  if (!file) return;
                  toast("Görsel yükleniyor…");
                  uploadImage(file).then(function (url) {
                    var range = quill.getSelection(true);
                    quill.insertEmbed(range ? range.index : quill.getLength(), "image", "/" + url, "user");
                    toast("Görsel eklendi");
                  }).catch(function (e) { toast(e.message, true); });
                });
              }
            }
          }
        }
      });
      if (post.content) quill.setContents(quill.clipboard.convert({ html: post.content }), "silent");
      quill.on("text-change", function () { markDirty(); });
      $("htmlArea").value = post.content || "";

      function setMode(next, force) {
        if (next === mode && !force) return;
        if (next === "html" && mode === "visual") {
          $("htmlArea").value = cleanHtml(quill.getSemanticHTML());
        } else if (next === "visual" && mode === "html") {
          var html = $("htmlArea").value;
          if (hasRichMarkup(html) && !force) {
            if (!window.confirm("Bu içerikte görsel düzenleyicinin koruyamayacağı özel yapılar var. Görsel moda geçerseniz kutular sade paragraflara dönüşür. Devam edilsin mi?")) return;
          }
          quill.setContents(quill.clipboard.convert({ html: html }), "silent");
        }
        mode = next;
        $("quillWrap").hidden = mode !== "visual";
        $("htmlArea").hidden = mode !== "html";
        $("richNotice").hidden = !(mode === "html" && hasRichMarkup($("htmlArea").value));
        view.querySelectorAll("[data-mode]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-mode") === mode); });
      }
      view.querySelectorAll("[data-mode]").forEach(function (b) {
        b.onclick = function () { setMode(b.getAttribute("data-mode")); };
      });
      setMode(mode, true);
      $("htmlArea").oninput = markDirty;

      /* Quill 2 boşlukları &nbsp; olarak verir; siteye düz boşluk gitsin, boş son paragraflar düşsün */
      function cleanHtml(html) {
        return String(html || "")
          .replace(/&nbsp;/g, " ")
          .replace(/(<p>\s*<\/p>\s*)+$/, "")
          .trim();
      }

      function currentContent() {
        return mode === "visual" ? cleanHtml(quill.getSemanticHTML()) : $("htmlArea").value;
      }

      /* --- Durum --- */
      function setStatusUI(st) {
        post.status = st;
        view.querySelectorAll("[data-status]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-status") === st); });
        $("publishBtn").textContent = st === "published" ? "Güncelle" : "Yayınla";
      }
      view.querySelectorAll("[data-status]").forEach(function (b) {
        b.onclick = function () { setStatusUI(b.getAttribute("data-status")); markDirty(); };
      });
      setStatusUI(post.status);

      /* --- Kapak --- */
      function drawCover() {
        var pv = $("coverPreview");
        if (post.coverImage) {
          pv.innerHTML = '<img src="../' + esc(post.coverImage) + '" alt="" />';
          $("coverRemove").hidden = false;
          $("coverAltWrap").hidden = false;
        } else {
          pv.className = "cover-preview thumb s" + post.coverStyle;
          pv.innerHTML = "";
          $("coverRemove").hidden = true;
          $("coverAltWrap").hidden = true;
        }
        if (post.coverImage) pv.className = "cover-preview";
        $("coverPick").innerHTML = [1, 2, 3, 4].map(function (n) {
          return '<button type="button" class="s' + n + (post.coverStyle === n && !post.coverImage ? " active" : "") + '" data-style="' + n + '" aria-label="Desen ' + n + '"></button>';
        }).join("");
        $("coverPick").querySelectorAll("button").forEach(function (b) {
          b.onclick = function () { post.coverStyle = parseInt(b.getAttribute("data-style"), 10); post.coverImage = ""; drawCover(); markDirty(); };
        });
      }
      $("coverUpload").onclick = function () {
        pickImage().then(function (file) {
          if (!file) return;
          toast("Görsel yükleniyor…");
          uploadImage(file).then(function (url) { post.coverImage = url; drawCover(); markDirty(); toast("Kapak görseli eklendi"); })
            .catch(function (e) { toast(e.message, true); });
        });
      };
      $("coverRemove").onclick = function () { post.coverImage = ""; drawCover(); markDirty(); };
      drawCover();

      /* --- SSS --- */
      var faq = (post.faq || []).map(function (f) { return { q: f.q, a: f.a }; });
      function drawFaq() {
        var box = $("faqList");
        if (!faq.length) { box.innerHTML = '<p class="small muted" style="margin:0 0 10px">Henüz soru eklenmedi.</p>'; return; }
        box.innerHTML = faq.map(function (f, i) {
          return '<div class="faq-item" data-i="' + i + '"><div class="faq-top"><input type="text" class="fq" placeholder="Soru" value="' + esc(f.q) + '" />' +
            '<button type="button" class="icon-btn fdel" aria-label="Soruyu kaldır">✕</button></div>' +
            '<div class="field"><textarea class="fa" placeholder="Kısa, net cevap">' + esc(f.a) + "</textarea></div></div>";
        }).join("");
        box.querySelectorAll(".faq-item").forEach(function (el) {
          var i = parseInt(el.getAttribute("data-i"), 10);
          el.querySelector(".fq").oninput = function () { faq[i].q = this.value; markDirty(); };
          el.querySelector(".fa").oninput = function () { faq[i].a = this.value; markDirty(); };
          el.querySelector(".fdel").onclick = function () { faq.splice(i, 1); drawFaq(); markDirty(); };
        });
        // alanların stilini .field'e uydur
        box.querySelectorAll(".fq").forEach(function (inp) { inp.style.cssText = "padding:9px 12px;border-radius:10px;border:1px solid var(--line-strong);background:#fff;"; });
      }
      $("faqAdd").onclick = function () { faq.push({ q: "", a: "" }); drawFaq(); var last = $("faqList").querySelector(".faq-item:last-child .fq"); if (last) last.focus(); };
      drawFaq();

      /* --- Sayaçlar / slug --- */
      function counter(inputId, countId, ideal) {
        var el = $(inputId), c = $(countId);
        function upd() { var n = el.value.length; c.textContent = n + " / " + ideal; c.classList.toggle("over", n > ideal); }
        el.addEventListener("input", upd); upd();
      }
      counter("pExcerpt", "excerptCount", 160);
      counter("pDescription", "descCount", 160);

      $("pTitle").oninput = function () {
        if (!slugTouched) $("pSlug").value = slugify(this.value);
        markDirty();
      };
      $("pSlug").oninput = function () { slugTouched = true; this.value = slugify(this.value) || this.value.toLowerCase(); markDirty(); };
      $("pSlug").onblur = function () { this.value = slugify(this.value); if (!this.value) { slugTouched = false; this.value = slugify($("pTitle").value); } };
      ["pCategory", "pBreadcrumb", "pExcerpt", "pLead", "pCtaTitle", "pCtaText", "pDate", "pReading", "pDescription", "pKeywords", "pCoverAlt"].forEach(function (id) {
        $(id).addEventListener("input", markDirty);
      });

      function markDirty() {
        if (!dirty) { dirty = true; $("saveState").textContent = "Kaydedilmemiş değişiklikler var"; }
      }

      /* --- Kaydet --- */
      function collect(status) {
        return {
          title: $("pTitle").value.trim(),
          slug: $("pSlug").value,
          category: $("pCategory").value,
          breadcrumb: $("pBreadcrumb").value,
          excerpt: $("pExcerpt").value,
          lead: $("pLead").value,
          content: currentContent(),
          faq: faq,
          ctaTitle: $("pCtaTitle").value,
          ctaText: $("pCtaText").value,
          status: status,
          datePublished: $("pDate").value,
          readingTime: $("pReading").value,
          coverImage: post.coverImage,
          coverAlt: $("pCoverAlt").value,
          coverStyle: post.coverStyle,
          description: $("pDescription").value,
          keywords: $("pKeywords").value
        };
      }

      function save(status) {
        var body = collect(status);
        if (!body.title) { toast("Başlık olmadan kaydedilemez.", true); $("pTitle").focus(); return Promise.reject(new Error("no-title")); }
        ["saveDraftBtn", "publishBtn", "previewBtn"].forEach(function (b) { $(b).disabled = true; });
        var req = post.id ? api("PUT", "/api/admin/posts/" + post.id, body) : api("POST", "/api/admin/posts", body);
        return req.then(function (r) {
          var wasNew = !post.id;
          Object.assign(post, r.item);
          dirty = false;
          $("pSlug").value = post.slug;
          $("saveState").textContent = "Son kayıt: " + whenLabel(post.updatedAt);
          setStatusUI(post.status);
          toast(status === "published" ? (wasNew ? "Yazı yayınlandı" : "Yazı güncellendi") : "Taslak kaydedildi");
          if (wasNew) {
            currentCleanup = null;
            history.replaceState(null, "", "#/yazilar/" + post.id);
            currentCleanup = cleanup;
          }
          return post;
        }).catch(function (e) { if (e.message !== "no-title") toast(e.message, true); throw e; })
          .then(function (p) { ["saveDraftBtn", "publishBtn", "previewBtn"].forEach(function (b) { $(b).disabled = false; }); return p; },
                function (e) { ["saveDraftBtn", "publishBtn", "previewBtn"].forEach(function (b) { $(b).disabled = false; }); throw e; });
      }

      $("saveDraftBtn").onclick = function () { save("draft").catch(function () {}); };
      $("publishBtn").onclick = function () { save("published").catch(function () {}); };
      $("previewBtn").onclick = function () {
        save(post.status).then(function (p) {
          window.open("../blog/" + p.slug + ".html?preview=1", "_blank", "noopener");
        }).catch(function () {});
      };
      if ($("delPost")) {
        $("delPost").onclick = function () {
          confirmDialog("Yazı silinsin mi?", "“" + post.title + "” kalıcı olarak silinir" + (post.legacyFile ? ". (Orijinal HTML dosyası diskte durur ama siteden kaldırılır.)" : ".") , "Yazıyı sil").then(function (ok) {
            if (!ok) return;
            api("DELETE", "/api/admin/posts/" + post.id).then(function () {
              dirty = false;
              toast("Yazı silindi");
              location.hash = "#/yazilar";
            }).catch(function (e) { toast(e.message, true); });
          });
        };
      }

      /* Ctrl/Cmd+S kaydeder */
      function onKey(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(post.status).catch(function () {}); }
      }
      document.addEventListener("keydown", onKey);
      function onUnload(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } }
      window.addEventListener("beforeunload", onUnload);

      function cleanup() {
        if (dirty && !window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılırsanız kaybolur. Devam edilsin mi?")) {
          history.pushState(null, "", "#/yazilar/" + (post.id || "yeni"));
          return false;
        }
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("beforeunload", onUnload);
        return true;
      }
      currentCleanup = cleanup;
      if (!post.id) setTimeout(function () { $("pTitle").focus(); }, 30);
    }).catch(function (e) { view.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
  }

  /* ------------------------------------------------------------------------
     Ayarlar
     ---------------------------------------------------------------------- */

  function renderSettings() {
    api("GET", "/api/admin/overview").then(function (d) {
      view.innerHTML =
        '<div class="page-head"><div><h1 class="page-title">Ayarlar</h1><p>Parola ve sunucu bilgileri.</p></div></div>' +
        '<div class="settings-grid">' +
        '<section class="card card-pad"><div class="card-title">Parolayı değiştir</div>' +
        '<form id="pwForm" novalidate>' +
        '<div class="field"><label for="pwCurrent">Mevcut parola</label><input type="password" id="pwCurrent" autocomplete="current-password" /></div>' +
        '<div class="field"><label for="pwNew">Yeni parola <span class="hint">en az 8 karakter</span></label><input type="password" id="pwNew" autocomplete="new-password" /></div>' +
        '<div class="field"><label for="pwNew2">Yeni parola (tekrar)</label><input type="password" id="pwNew2" autocomplete="new-password" /></div>' +
        '<p class="form-error" id="pwError" role="alert"></p>' +
        '<button type="submit" class="btn btn-primary">Parolayı güncelle</button></form></section>' +
        '<section class="card card-pad"><div class="card-title">Site</div><dl class="kv">' +
        "<dt>Adres</dt><dd>" + esc(d.siteUrl) + "</dd>" +
        "<dt>E-posta bildirimi</dt><dd>" + (d.emailForwarding ? "Açık — her mesaj Web3Forms üzerinden e-postanıza da gider." : "Kapalı — mesajlar yalnızca panelde. Açmak için <code>config.js</code> → <code>web3formsAccessKey</code>.") + "</dd>" +
        "<dt>Veriler</dt><dd>Mesajlar ve yazılar sunucudaki <code>data/</code> klasöründe, görseller <code>uploads/</code> içinde tutulur. Yedek almak için bu iki klasörü kopyalamanız yeterli.</dd>" +
        "<dt>Eski yazılar</dt><dd>Daha önce elle yazılmış 4 yazı panele aktarıldı; artık buradan düzenlenir. Orijinal HTML dosyaları diskte duruyor ama site veritabanındaki sürümü gösterir.</dd>" +
        "</dl></section></div>";

      $("pwForm").onsubmit = function (e) {
        e.preventDefault();
        var err = $("pwError");
        err.textContent = "";
        var n = $("pwNew").value;
        if (n.length < 8) { err.textContent = "Yeni parola en az 8 karakter olmalı."; return; }
        if (n !== $("pwNew2").value) { err.textContent = "Yeni parolalar birbirinden farklı."; return; }
        api("POST", "/api/admin/password", { current: $("pwCurrent").value, password: n })
          .then(function () { toast("Parola güncellendi"); $("pwForm").reset(); })
          .catch(function (e2) { err.textContent = e2.message; });
      };
    }).catch(function (e) { view.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });
  }

  /* ------------------------------------------------------------------------
     Başlat
     ---------------------------------------------------------------------- */

  fetch("/api/admin/status", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (s) {
      if (!s.configured) showGate("setup");
      else if (!s.authenticated) showGate("login");
      else { showShell(); route(); }
    })
    .catch(function () {
      $("gate").hidden = false;
      $("gateError").textContent = "Sunucuya ulaşılamıyor. Panel yalnızca Node sunucusu çalışırken açılır (npm start).";
    });
})();
