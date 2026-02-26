(function () {
  const analyzeNav = document.getElementById("analyze-nav");
  const analyzeSubmenu = document.getElementById("analyze-submenu");
  const performanceLink = document.getElementById("performance-intelligence");
  const adminNav = document.getElementById("admin-nav");
  const adminSubmenu = document.getElementById("admin-submenu");
  const adminOptions = document.querySelectorAll(".admin-option");

  if (!analyzeNav || !analyzeSubmenu || !performanceLink) return;

  let hideTimeout;
  let selectedClient = "dnkn";

  const allSubmenus = [analyzeSubmenu, adminSubmenu].filter(Boolean);

  function setupHoverSubmenu(triggerEl, submenuEl) {
    if (!triggerEl || !submenuEl) return;
    triggerEl.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
      // Immediately hide all other submenus when opening a new one (fixes fast hover glitch)
      allSubmenus.forEach((m) => {
        if (m !== submenuEl) m.classList.add("hidden");
      });
      submenuEl.classList.remove("hidden");
    });
    triggerEl.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(() => submenuEl.classList.add("hidden"), 150);
    });
    submenuEl.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
    submenuEl.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(() => submenuEl.classList.add("hidden"), 150);
    });
  }

  setupHoverSubmenu(analyzeNav, analyzeSubmenu);
  setupHoverSubmenu(adminNav, adminSubmenu);

  const pageTitle = document.getElementById("page-title");

  function updatePageTitle(client) {
    if (pageTitle) pageTitle.textContent = `Commerce Control Center (${client})`;
  }

  adminOptions.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.preventDefault();
      selectedClient = opt.getAttribute("data-client") || "dnkn";
      adminOptions.forEach((o) => o.classList.remove("bg-sky-100", "font-medium"));
      opt.classList.add("bg-sky-100", "font-medium");
      updatePageTitle(selectedClient);

      // Brief blink for confirmation, then close menu
      opt.classList.remove("admin-option-blink");
      opt.offsetHeight; // force reflow so animation replays
      opt.classList.add("admin-option-blink");
      setTimeout(() => {
        opt.classList.remove("admin-option-blink");
        adminSubmenu?.classList.add("hidden");
      }, 350);
    });
  });

  if (adminOptions.length) adminOptions[0].classList.add("bg-sky-100", "font-medium");

  performanceLink.addEventListener("click", (e) => {
    e.preventDefault();
    fetch(`/api/embed-url?client=${encodeURIComponent(selectedClient)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to get embed URL");
        return res.json();
      })
      .then((data) => {
        if (data.url) {
          window.open(data.url, "_blank");
        } else {
          throw new Error("No URL in response");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to open Performance Intelligence. Please try again.");
      });
  });
})();
