const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const backToTop = document.getElementById("backToTop");
const cursorGlow = document.getElementById("cursorGlow");
const revealElements = document.querySelectorAll(".reveal");
const sections = document.querySelectorAll(".section");
const dots = document.querySelectorAll(".dot");
const typedText = document.getElementById("typedText");
const siteHeader = document.getElementById("siteHeader");
const blogModal = document.getElementById("blogModal");
const blogModalOverlay = document.getElementById("blogModalOverlay");
const modalClose = document.getElementById("modalClose");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const blogButtons = document.querySelectorAll(".blog-read");
const logoDot = document.querySelector(".logo-dot");
const privacyModal = document.getElementById("privacyModal");
const privacyModalOverlay = document.getElementById("privacyModalOverlay");
const privacyModalClose = document.getElementById("privacyModalClose");
const privacyLink = document.getElementById("privacyLink");

const typingPhrases = [
  "Psikoterapi, yaşamınızda olumlu değişiklikler yapmak için güçlü bir araç olabilir."
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let navPinned = false;
let navCollapsed = false;

function typeEffect() {
  const currentPhrase = typingPhrases[phraseIndex];

  if (!isDeleting) {
    typedText.textContent = currentPhrase.slice(0, charIndex + 1);
    charIndex++;

    if (charIndex === currentPhrase.length) {
      isDeleting = true;
      setTimeout(typeEffect, 1800);
      return;
    }
  } else {
    typedText.textContent = currentPhrase.slice(0, charIndex - 1);
    charIndex--;

    if (charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % typingPhrases.length;
    }
  }

  setTimeout(typeEffect, isDeleting ? 45 : 75);
}

typeEffect();

// Handle URL hash on page load - always start from home
window.addEventListener("load", () => {
  // Reset to home when page loads
  window.location.hash = "#home";
  window.scrollTo(0, 0);
});

// Also handle when hash changes while on page
window.addEventListener("hashchange", () => {
  const hash = window.location.hash;
  if (hash && hash !== "#home") {
    const targetId = hash.replace("#", "");
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      setTimeout(() => {
        smoothScrollToSection(targetId);
      }, 100);
    }
  }
});

// Helper function for smooth scroll with header offset
function smoothScrollToSection(targetId) {
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    const headerHeight = siteHeader.offsetHeight;
    const targetPosition = targetElement.offsetTop - headerHeight - 20;
    window.scrollTo({
      top: targetPosition,
      behavior: "smooth"
    });
  }
}

hamburger.addEventListener("click", () => {
  mobileMenu.classList.toggle("open");
});

mobileMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    mobileMenu.classList.remove("open");
    const href = link.getAttribute("href");
    const targetId = href.replace("#", "");
    
    // Show navbar if returning to home, hide for other sections
    if (targetId === "home") {
      siteHeader.style.display = "flex";
      siteHeader.style.opacity = "1";
      siteHeader.style.pointerEvents = "auto";
    } else {
      // Hide navbar for non-home sections with delay
      setTimeout(() => {
        siteHeader.style.opacity = "0";
        siteHeader.style.pointerEvents = "none";
      }, 100);
    }
    
    smoothScrollToSection(targetId);
    window.history.pushState(null, null, href);
  });
});


// Side dots navigation
dots.forEach((dot) => {
  dot.addEventListener("click", (e) => {
    e.preventDefault();
    const href = dot.getAttribute("href");
    const targetId = href.replace("#", "");
    
    // Show navbar if returning to home, hide for other sections
    if (targetId === "home") {
      siteHeader.style.display = "flex";
      siteHeader.style.opacity = "1";
      siteHeader.style.pointerEvents = "auto";
    } else {
      // Hide navbar for non-home sections with delay
      setTimeout(() => {
        siteHeader.style.opacity = "0";
        siteHeader.style.pointerEvents = "none";
      }, 100);
    }
    
    smoothScrollToSection(targetId);
    window.history.pushState(null, null, href);
  });
});

// Desktop nav links
document.querySelectorAll(".desktop-nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const href = link.getAttribute("href");
    const targetId = href.replace("#", "");
    
    // Show navbar if returning to home, hide for other sections
    if (targetId === "home") {
      siteHeader.style.display = "flex";
      siteHeader.style.opacity = "1";
      siteHeader.style.pointerEvents = "auto";
    } else {
      // Hide navbar for non-home sections with delay
      setTimeout(() => {
        siteHeader.style.opacity = "0";
        siteHeader.style.pointerEvents = "none";
      }, 100);
    }
    
    smoothScrollToSection(targetId);
    window.history.pushState(null, null, href);
  });
});

// Logo click
document.querySelector(".logo").addEventListener("click", (e) => {
  e.preventDefault();
  // Show navbar when returning to home
  siteHeader.style.display = "flex";
  siteHeader.style.opacity = "1";
  siteHeader.style.pointerEvents = "auto";
  smoothScrollToSection("home");
  window.history.pushState(null, null, "#home");
});

window.addEventListener("scroll", () => {
  if (window.scrollY > 260) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }

  // Show/hide navbar based on scroll position with fade animation
  const homeSection = document.getElementById("home");
  if (homeSection) {
    const homeSectionBottom = homeSection.offsetTop + homeSection.offsetHeight;
    
    if (window.scrollY < homeSectionBottom) {
      // In home section - show navbar with animation
      siteHeader.style.opacity = "1";
      siteHeader.style.pointerEvents = "auto";
      siteHeader.style.display = "flex";
    } else {
      // Below home section - hide navbar with animation
      siteHeader.style.opacity = "0";
      siteHeader.style.pointerEvents = "none";
      // Keep display for smooth fade, don't set to none immediately
    }
  }

  if (!navPinned) {
    if (window.scrollY > 70 && !navCollapsed) {
      siteHeader.classList.add("collapsed");
      navCollapsed = true;
    } else if (window.scrollY <= 70 && navCollapsed) {
      siteHeader.classList.remove("collapsed");
      navCollapsed = false;
    }
  }

  updateActiveDot();
});

backToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

window.addEventListener("mousemove", (e) => {
  cursorGlow.style.left = `${e.clientX}px`;
  cursorGlow.style.top = `${e.clientY}px`;
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  {
    threshold: 0.16
  }
);

revealElements.forEach((element) => observer.observe(element));

function updateActiveDot() {
  let currentId = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    if (window.scrollY >= sectionTop - 180) {
      currentId = section.getAttribute("id");
    }
  });

  // Update URL when scrolling
  if (currentId) {
    window.history.replaceState(null, null, `#${currentId}`);
  }

  dots.forEach((dot) => {
    dot.classList.remove("active");
    const href = dot.getAttribute("href").replace("#", "");
    if (href === currentId) {
      dot.classList.add("active");
    }
  });
}

blogButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const title = button.dataset.title;
    const content = button.dataset.content;

    modalTitle.textContent = title;
    modalText.textContent = content;
    blogModal.classList.add("open");
    document.body.style.overflow = "hidden";
  });
});

function closeModal() {
  blogModal.classList.remove("open");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
blogModalOverlay.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

function openPrivacyModal() {
  privacyModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePrivacyModal() {
  privacyModal.classList.remove("open");
  document.body.style.overflow = "";
}

privacyLink.addEventListener("click", openPrivacyModal);
privacyModalClose.addEventListener("click", closePrivacyModal);
privacyModalOverlay.addEventListener("click", closePrivacyModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closePrivacyModal();
  }
});

// Footer links navigation
document.querySelectorAll(".site-footer a[href^='#']").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const href = link.getAttribute("href");
    const targetId = href.replace("#", "");
    
    // Show navbar if returning to home, hide for other sections
    if (targetId === "home") {
      siteHeader.style.display = "flex";
      siteHeader.style.opacity = "1";
      siteHeader.style.pointerEvents = "auto";
    } else {
      // Hide navbar for non-home sections with delay
      setTimeout(() => {
        siteHeader.style.opacity = "0";
        siteHeader.style.pointerEvents = "none";
      }, 100);
    }
    
    smoothScrollToSection(targetId);
    window.history.pushState(null, null, href);
  });
});


updateActiveDot();