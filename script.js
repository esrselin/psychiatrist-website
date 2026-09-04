/* ==========================================================================
   Barış Karahüseyin — site davranışları
   Yapılandırma için config.js dosyasına bakın.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var CONSENT_KEY = "bk-consent-v1";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  function $(id) {
    return document.getElementById(id);
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* gizli sekme / depolama kapalı — sessizce yoksay */
    }
  }

  /* ========================================================================
     1) İletişim bilgilerini config'ten doldur (tel:, mailto:, wa.me)
     ====================================================================== */

  function applyContactLinks() {
    var tel = CFG.phoneRaw || "";
    var wa = CFG.whatsappNumber || "";
    var mail = CFG.publicEmail || "";
    var waText = encodeURIComponent(
      "Merhaba, web siteniz üzerinden yazıyorum. Randevu hakkında bilgi almak istiyorum."
    );

    document.querySelectorAll('[data-link="tel"]').forEach(function (el) {
      if (tel) el.setAttribute("href", "tel:" + tel);
    });

    document.querySelectorAll('[data-link="whatsapp"]').forEach(function (el) {
      if (!wa) return;
      el.setAttribute("href", "https://wa.me/" + wa + "?text=" + waText);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });

    document.querySelectorAll('[data-link="mail"]').forEach(function (el) {
      if (mail) el.setAttribute("href", "mailto:" + mail);
    });

    document.querySelectorAll('[data-text="phone"]').forEach(function (el) {
      if (CFG.phoneDisplay) el.textContent = CFG.phoneDisplay;
    });

    document.querySelectorAll('[data-text="email"]').forEach(function (el) {
      if (mail) el.textContent = mail;
    });
  }

  /* ========================================================================
     2) Telif yılı
     ====================================================================== */

  function applyYear() {
    var el = $("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ========================================================================
     3) Yazı (typing) efekti
     - Tek sefer yazar, silme döngüsü yok  → CPU/pil tüketmez
     - Sekme arka plandayken duraklar
     - Hareket azaltma tercihinde anında tam metin gösterir
     ====================================================================== */

  function setupTyping() {
    var target = $("typedText");
    if (!target) return;

    // Cümle .typing-phrase'den okunur; ölçerdeki imleç karakteri metne karışmasın.
    var phraseEl =
      document.querySelector(".typing-phrase") ||
      document.querySelector(".typing-sizer");
    var phrase = phraseEl ? phraseEl.textContent.trim() : "";
    if (!phrase) return;

    // NOT: Yazı efekti bilinçli olarak "hareket azaltma" tercihinden muaf
    // tutuldu (site sahibinin talebi). Metnin harf harf belirmesi vestibüler
    // açıdan düşük riskli; buna karşılık tekrar eden imleç yanıp sönmesi ve
    // diğer büyük hareketler o tercihte kapalı kalmaya devam ediyor.
    var index = 0;
    var timer = null;

    function step() {
      if (document.hidden) {
        timer = window.setTimeout(step, 400);
        return;
      }

      index += 1;
      target.textContent = phrase.slice(0, index);

      if (index < phrase.length) {
        timer = window.setTimeout(step, 45);
      } else {
        timer = null; // bitti — döngü yok
      }
    }

    timer = window.setTimeout(step, 350);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && timer === null && index < phrase.length) {
        timer = window.setTimeout(step, 60);
      }
    });
  }

  /* ========================================================================
     4) Mobil menü  (aria-expanded, Escape, dışarı tıklama, odak yönetimi)
     ====================================================================== */

  function setupMobileMenu() {
    var hamburger = $("hamburger");
    var menu = $("mobileMenu");
    if (!hamburger || !menu) return;

    function isOpen() {
      return hamburger.getAttribute("aria-expanded") === "true";
    }

    function open() {
      hamburger.setAttribute("aria-expanded", "true");
      hamburger.setAttribute("aria-label", "Menüyü kapat");
      menu.classList.add("open");
      var first = menu.querySelector("a");
      if (first) first.focus();
    }

    function close(returnFocus) {
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "Menüyü aç");
      menu.classList.remove("open");
      if (returnFocus) hamburger.focus();
    }

    hamburger.addEventListener("click", function () {
      if (isOpen()) close(false);
      else open();
    });

    menu.querySelectorAll("a").forEach(function (link) {
      // preventDefault YOK: tarayıcının kendi hash navigasyonu korunur
      // (deep link, geri tuşu ve scroll-padding-top doğru çalışsın diye)
      link.addEventListener("click", function () {
        close(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close(true);
    });

    document.addEventListener("click", function (e) {
      if (!isOpen()) return;
      if (menu.contains(e.target) || hamburger.contains(e.target)) return;
      close(false);
    });

    // Masaüstüne geçildiğinde açık kalmasın
    window.matchMedia("(min-width: 1025px)").addEventListener("change", function (ev) {
      if (ev.matches && isOpen()) close(false);
    });
  }

  /* ========================================================================
     5) Scroll: rAF ile kısıtlanmış tek dinleyici
     ====================================================================== */

  function setupScroll() {
    var header = $("siteHeader");
    var backToTop = $("backToTop");
    var ticking = false;

    function onFrame() {
      var y = window.scrollY;

      if (header) header.classList.toggle("scrolled", y > 24);
      if (backToTop) backToTop.classList.toggle("show", y > 320);

      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(onFrame);
        }
      },
      { passive: true }
    );

    onFrame();

    if (backToTop) {
      backToTop.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion.matches ? "auto" : "smooth"
        });
      });
    }
  }

  /* ========================================================================
     6) Scrollspy — IntersectionObserver
     replaceState YALNIZCA aktif bölüm değiştiğinde çağrılır.
     (Eski kod her scroll frame'inde çağırıyordu → Safari/Firefox throttle hatası)
     ====================================================================== */

  var suppressHashUntil = 0;

  /* ------------------------------------------------------------------------
     6a) Bölüme yumuşak ve ORTALI kaydırma
     - Ekranı dolduran bölüm (fit-section): üst kenarı ekranın üstüne oturur.
       İçerik zaten dikey ortalı olduğu için bölüm ekrana tam ortalanmış gelir.
     - Kısa bölüm: dikey olarak ekranın ortasına alınır.
     - Bölüm olmayan hedef (makale başlığı, #main): header yüksekliği kadar boşluk.
     `behavior: "smooth"` açıkça verildiği için CSS'teki scroll-behavior'dan
     etkilenmez; kaydırma efekti her koşulda çalışır.
     ---------------------------------------------------------------------- */

  function getHeaderOffset() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(
      "--header-h"
    );
    var n = parseInt(raw, 10);
    return isNaN(n) ? 100 : n;
  }

  function scrollToTarget(el, behavior) {
    var headerH = getHeaderOffset();
    var vh = window.innerHeight;
    var rect = el.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    var h = rect.height;
    var target;

    if (el.classList.contains("section")) {
      if (h >= vh - 40) {
        target = top;
      } else {
        target = top + h / 2 - vh / 2;
        target = Math.min(target, top - headerH);
      }
    } else {
      target = top - headerH - 8;
    }

    var max = Math.max(
      0,
      document.documentElement.scrollHeight - vh
    );
    target = Math.max(0, Math.min(target, max));

    window.scrollTo({
      top: target,
      behavior: behavior || "smooth"
    });
  }

  function setupSmoothNav() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link) return;

      var href = link.getAttribute("href");
      if (!href || href === "#") return;

      var el;
      try {
        el = document.querySelector(href);
      } catch (err) {
        return;
      }
      if (!el) return;

      e.preventDefault();
      suppressHashUntil = Date.now() + 1100;
      scrollToTarget(el, "smooth");

      try {
        window.history.pushState(null, "", href);
      } catch (err) {
        /* yoksay */
      }
    });
  }

  function setupScrollSpy() {
    var sections = Array.prototype.slice.call(
      document.querySelectorAll("main .section")
    );
    if (!sections.length || !("IntersectionObserver" in window)) return;

    var dots = document.querySelectorAll(".side-dots .dot");
    var navLinks = document.querySelectorAll(
      '.desktop-nav a[href^="#"], .mobile-menu a[href^="#"]'
    );
    var currentId = "";

    function setActive(id) {
      if (!id || id === currentId) return;
      currentId = id;

      dots.forEach(function (dot) {
        var match = dot.getAttribute("href") === "#" + id;
        dot.classList.toggle("active", match);
      });

      navLinks.forEach(function (link) {
        if (link.getAttribute("href") === "#" + id) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      if (Date.now() > suppressHashUntil) {
        try {
          window.history.replaceState(null, "", "#" + id);
        } catch (e) {
          /* tarayıcı sınırı — yoksay */
        }
      }
    }

    var visible = Object.create(null);

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var id = entry.target.id;
          if (entry.isIntersecting) visible[id] = entry.intersectionRatio;
          else delete visible[id];
        });

        var best = "";
        var bestRatio = -1;
        Object.keys(visible).forEach(function (id) {
          if (visible[id] > bestRatio) {
            bestRatio = visible[id];
            best = id;
          }
        });

        if (best) setActive(best);
      },
      {
        // Viewport'un orta bandına giren bölüm aktif sayılır
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 1]
      }
    );

    sections.forEach(function (section) {
      if (section.id) observer.observe(section);
    });

  }

  /* ========================================================================
     7) Reveal animasyonları
     ====================================================================== */

  function setupReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ========================================================================
     8) İmleç ışıması — yalnızca gerçek fare + hareket tercihi açıkken,
        rAF ile kısıtlanmış. Dokunmatik cihazda DOM'dan tamamen kaldırılır.
     ====================================================================== */

  function setupCursorGlow() {
    var glow = $("cursorGlow");
    if (!glow) return;

    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (!finePointer.matches || prefersReducedMotion.matches) {
      glow.remove();
      return;
    }

    var x = 0;
    var y = 0;
    var queued = false;

    function paint() {
      glow.style.transform =
        "translate3d(" + (x - 120) + "px," + (y - 120) + "px,0)";
      queued = false;
    }

    window.addEventListener(
      "mousemove",
      function (e) {
        x = e.clientX;
        y = e.clientY;
        if (!queued) {
          queued = true;
          window.requestAnimationFrame(paint);
        }
      },
      { passive: true }
    );
  }

  /* ========================================================================
     9) Derin bağlantı (deep link)
        Eski kod açılışta koşulsuz "#home"a zorluyordu → paylaşılan
        /#iletisim linkleri çalışmıyordu. Artık hash'e saygı duyuluyor.
     ====================================================================== */

  function honourDeepLink() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    var target;
    try {
      target = document.querySelector(hash);
    } catch (e) {
      return;
    }
    if (!target) return;

    // Kullanıcı kendi kaydırmaya başlarsa hedef tazeleme iptal edilir.
    var iptal = false;
    ["wheel", "touchstart", "keydown"].forEach(function (ev) {
      window.addEventListener(
        ev,
        function () {
          iptal = true;
        },
        { passive: true, once: true }
      );
    });

    function git() {
      if (iptal) return;
      suppressHashUntil = Date.now() + 900;
      // rAF DEĞİL: boyanmamış sekmede tetiklenmediği için derin bağlantı
      // hedefe kaydırmıyordu.
      scrollToTarget(target, "auto");
    }

    window.setTimeout(git, 30);

    // Görseller ve yazı tipleri yüklendikçe bölüm yükseklikleri değişiyor;
    // ilk hesaplanan hedef kayıyordu. Yükleme bitince hedefi tazele.
    if (document.readyState === "complete") {
      window.setTimeout(git, 300);
    } else {
      window.addEventListener("load", function () {
        window.setTimeout(git, 250);
      });
    }
  }

  /* ========================================================================
     10) Çerez / üçüncü taraf onayı
     ====================================================================== */

  function getConsent() {
    return storageGet(CONSENT_KEY); // "all" | "necessary" | null
  }

  function setupConsent() {
    var banner = $("consentBanner");
    var accept = $("consentAccept");
    var reject = $("consentReject");
    var reopen = $("reopenConsent");

    function hide() {
      if (!banner) return;
      banner.classList.remove("show");
      window.setTimeout(function () {
        banner.hidden = true;
      }, 450);
    }

    function show() {
      if (!banner) return;
      banner.hidden = false;
      // rAF DEĞİL: arka planda açılan (henüz boyanmamış) sekmede rAF
      // tetiklenmediği için bildirim ekran dışında kalıyordu.
      window.setTimeout(function () {
        banner.classList.add("show");
      }, 30);
    }

    if (banner && !getConsent()) {
      window.setTimeout(show, 900);
    }

    if (accept) {
      accept.addEventListener("click", function () {
        storageSet(CONSENT_KEY, "all");
        hide();
        loadAnalytics();
        autoLoadThirdParty();
      });
    }

    if (reject) {
      reject.addEventListener("click", function () {
        storageSet(CONSENT_KEY, "necessary");
        hide();
      });
    }

    if (reopen) {
      reopen.addEventListener("click", function (e) {
        e.preventDefault();
        show();
      });
    }
  }

  /* ========================================================================
     11) Analitik — YALNIZCA "tümünü kabul et" seçildiyse yüklenir
     ====================================================================== */

  var analyticsLoaded = false;

  function loadAnalytics() {
    if (analyticsLoaded) return;
    if (!CFG.ga4MeasurementId) return;
    if (getConsent() !== "all") return;

    analyticsLoaded = true;

    var s = document.createElement("script");
    s.async = true;
    s.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(CFG.ga4MeasurementId);
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", CFG.ga4MeasurementId, { anonymize_ip: true });
  }

  /* ========================================================================
     12) Google Haritalar — tıklayınca / onayla yüklenir
     ====================================================================== */

  var MAP_SRC =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d48163.351005098615!2d28.738157477909308!3d41.02067366499198!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14caa4102814e62d%3A0xf17358ce73944614!2zS8O8w6fDvGvDp2VrbWVjZS_EsHN0YW5idWw!5e0!3m2!1str!2str!4v1744478494990!5m2!1str!2str";

  function loadMap() {
    var holder = $("mapPlaceholder");
    if (!holder || holder.dataset.loaded === "1") return;
    holder.dataset.loaded = "1";

    var frame = document.createElement("iframe");
    frame.src = MAP_SRC;
    frame.width = "100%";
    frame.height = "220";
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer-when-downgrade";
    frame.className = "map-frame";
    frame.title = "Küçükçekmece, İstanbul konumunu gösteren harita";
    frame.setAttribute("allowfullscreen", "");

    holder.replaceWith(frame);
  }

  function setupMap() {
    var btn = $("loadMap");
    if (btn) btn.addEventListener("click", loadMap);
  }

  /* ========================================================================
     13) Calendly — randevu takvimi
     ====================================================================== */

  var calendlyLoaded = false;

  function loadCalendly() {
    if (calendlyLoaded || !CFG.calendlyUrl) return;
    calendlyLoaded = true;

    var holder = $("calendlyHolder");
    var btn = $("loadCalendly");
    var intro = $("calendlyIntro");
    if (!holder) return;

    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://assets.calendly.com/assets/external/widget.css";
    document.head.appendChild(css);

    var script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;

    script.onload = function () {
      if (window.Calendly && window.Calendly.initInlineWidget) {
        window.Calendly.initInlineWidget({
          url: CFG.calendlyUrl + "?hide_gdpr_banner=0&locale=tr",
          parentElement: holder
        });
        holder.classList.add("loaded");
        if (btn) btn.hidden = true;
        if (intro) intro.hidden = true;
      } else {
        fallbackCalendlyLink();
      }
    };

    script.onerror = fallbackCalendlyLink;
    document.head.appendChild(script);

    function fallbackCalendlyLink() {
      holder.innerHTML =
        '<p class="third-party-note">Takvim yüklenemedi. ' +
        '<a href="' +
        CFG.calendlyUrl +
        '" target="_blank" rel="noopener noreferrer">Randevu sayfasını yeni sekmede açın →</a></p>';
    }
  }

  function setupBooking() {
    var section = $("randevu");
    if (!section) return;

    var calendlyBlock = $("calendlyBlock");
    var fallback = $("bookingFallback");
    var subtext = $("bookingSubtext");

    // Calendly bağlanmadıysa bölüm KALDIRILMAZ; yerine çalışan bir
    // alternatif gösterilir. Böylece "Randevu" bağlantıları hep bir yere gider.
    if (!CFG.calendlyUrl) {
      if (calendlyBlock) calendlyBlock.hidden = true;
      if (fallback) fallback.hidden = false;
      if (subtext) {
        subtext.textContent =
          "Randevu talebiniz için benimle iletişime geçmeniz yeterli. " +
          "En kısa sürede dönüş yaparak uygun zamanı birlikte belirleyelim.";
      }
      return;
    }

    if (fallback) fallback.hidden = true;
    if (calendlyBlock) calendlyBlock.hidden = false;

    var btn = $("loadCalendly");
    if (btn) btn.addEventListener("click", loadCalendly);

    if (getConsent() === "all") loadCalendly();
  }

  function autoLoadThirdParty() {
    if (getConsent() !== "all") return;
    loadMap();
    loadCalendly();
  }

  /* ========================================================================
     14) İletişim formu
         - Alan bazlı doğrulama + erişilebilir hata mesajları
         - Web3Forms üzerinden e-posta gönderimi (anahtar config.js'te)
         - Anahtar yoksa mailto yedeği: mesaj asla sessizce kaybolmaz
     ====================================================================== */

  function setupForm() {
    var form = $("contact-form");
    if (!form) return;

    var statusEl = $("formStatus");
    var submitBtn = $("submitBtn");
    var submitLabel = $("submitLabel");

    var fields = [
      {
        input: $("cf-name"),
        error: $("err-name"),
        validate: function (v) {
          if (!v.trim()) return "Lütfen adınızı ve soyadınızı girin.";
          if (v.trim().length < 3) return "Lütfen adınızı eksiksiz girin.";
          return "";
        }
      },
      {
        input: $("cf-phone"),
        error: $("err-phone"),
        validate: function (v) {
          var digits = v.replace(/\D/g, "");
          if (!digits) return "Lütfen telefon numaranızı girin.";
          if (digits.length < 10)
            return "Telefon numarası en az 10 haneli olmalıdır.";
          return "";
        }
      },
      {
        input: $("cf-email"),
        error: $("err-email"),
        validate: function (v) {
          if (!v.trim()) return ""; // isteğe bağlı
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()))
            return "Lütfen geçerli bir e-posta adresi girin.";
          return "";
        }
      },
      {
        input: $("cf-message"),
        error: $("err-message"),
        validate: function (v) {
          if (!v.trim()) return "Lütfen mesajınızı yazın.";
          if (v.trim().length < 10)
            return "Mesajınız en az 10 karakter olmalıdır.";
          return "";
        }
      },
      {
        input: $("cf-consent"),
        error: $("err-consent"),
        isCheckbox: true,
        validate: function (_v, checked) {
          if (!checked)
            return "Devam edebilmek için aydınlatma metnini onaylamanız gerekir.";
          return "";
        }
      }
    ].filter(function (f) {
      return f.input && f.error;
    });

    function showFieldError(field, message) {
      field.error.textContent = message;
      if (message) field.input.setAttribute("aria-invalid", "true");
      else field.input.removeAttribute("aria-invalid");
    }

    function validateField(field) {
      var message = field.isCheckbox
        ? field.validate("", field.input.checked)
        : field.validate(field.input.value);
      showFieldError(field, message);
      return !message;
    }

    fields.forEach(function (field) {
      field.input.addEventListener("blur", function () {
        validateField(field);
      });
      field.input.addEventListener("input", function () {
        if (field.error.textContent) validateField(field);
      });
      if (field.isCheckbox) {
        field.input.addEventListener("change", function () {
          validateField(field);
        });
      }
    });

    function setStatus(type, message) {
      if (!statusEl) return;
      statusEl.className = "form-status show " + type;
      statusEl.textContent = message;
    }

    function clearStatus() {
      if (!statusEl) return;
      statusEl.className = "form-status";
      statusEl.textContent = "";
    }

    function setBusy(busy) {
      if (submitBtn) submitBtn.disabled = busy;
      if (submitLabel) submitLabel.textContent = busy ? "Gönderiliyor…" : "Gönder";
    }

    function readValues() {
      return {
        name: ($("cf-name") || {}).value || "",
        phone: ($("cf-phone") || {}).value || "",
        email: ($("cf-email") || {}).value || "",
        message: ($("cf-message") || {}).value || ""
      };
    }

    function mailtoFallback(v) {
      var to = CFG.formRecipient || CFG.publicEmail || "";
      var subject = "Web sitesi iletişim formu — " + v.name;
      var body =
        "Ad Soyad: " +
        v.name +
        "\nTelefon: " +
        v.phone +
        "\nE-posta: " +
        (v.email || "-") +
        "\n\nMesaj:\n" +
        v.message +
        "\n\n(KVKK aydınlatma metni onaylandı.)";

      window.location.href =
        "mailto:" +
        to +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      setStatus(
        "info",
        "E-posta uygulamanız açılıyor. Mesajı göndermek için açılan pencereden " +
          '"Gönder"e basmanız yeterli. Dilerseniz WhatsApp üzerinden de yazabilirsiniz.'
      );
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearStatus();

      // Bal küpü (honeypot) doluysa bot demektir — sessizce yoksay
      var honeypot = form.querySelector('input[name="_gotcha"]');
      if (honeypot && honeypot.value) return;

      var allValid = true;
      var firstInvalid = null;

      fields.forEach(function (field) {
        var ok = validateField(field);
        if (!ok) {
          allValid = false;
          if (!firstInvalid) firstInvalid = field.input;
        }
      });

      if (!allValid) {
        setStatus("error", "Lütfen işaretli alanları kontrol edin.");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var v = readValues();

      if (!CFG.web3formsAccessKey) {
        mailtoFallback(v);
        return;
      }

      setBusy(true);
      setStatus("info", "Mesajınız gönderiliyor…");

      var payload = {
        access_key: CFG.web3formsAccessKey,
        subject: "Web sitesi iletişim formu — " + v.name,
        from_name: "bariskarahuseyin.com",
        replyto: v.email || "",
        "Ad Soyad": v.name,
        "Telefon": v.phone,
        "E-posta": v.email || "-",
        "Mesaj": v.message,
        "KVKK Onayı": "Aydınlatma metni okundu, açık rıza verildi."
      };

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () {
            return { success: res.ok };
          });
        })
        .then(function (data) {
          setBusy(false);

          if (data && data.success) {
            form.reset();
            fields.forEach(function (field) {
              showFieldError(field, "");
            });
            setStatus(
              "success",
              "Mesajınız iletildi. En kısa sürede size geri dönüş yapacağım. " +
                "Acil bir durumdaysanız lütfen 112'yi arayın."
            );
            if (window.gtag) window.gtag("event", "contact_form_submit");
          } else {
            setStatus(
              "error",
              "Mesaj gönderilemedi. Lütfen WhatsApp veya telefon ile ulaşmayı deneyin."
            );
          }
        })
        .catch(function () {
          setBusy(false);
          setStatus(
            "error",
            "Bağlantı kurulamadı. E-posta uygulamanız üzerinden göndermeyi deneyelim…"
          );
          window.setTimeout(function () {
            mailtoFallback(v);
          }, 1200);
        });
    });
  }

  /* ========================================================================
     Başlat
     ====================================================================== */

  function init() {
    applyContactLinks();
    applyYear();
    setupTyping();
    setupMobileMenu();
    setupScroll();
    // setupBooking, scrollspy'dan ÖNCE: Calendly kurulmadıysa #randevu bölümü
    // ve noktası kaldırılır; scrollspy geriye kalan bölümleri gözlemlesin.
    setupBooking();
    setupSmoothNav();
    setupScrollSpy();
    setupReveal();
    setupCursorGlow();
    setupConsent();
    setupMap();
    setupForm();
    honourDeepLink();

    if (getConsent() === "all") {
      loadAnalytics();
      autoLoadThirdParty();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
