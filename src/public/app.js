(function () {
  const analyzeNav = document.getElementById("analyze-nav");
  const analyzeSubmenu = document.getElementById("analyze-submenu");
  const performanceLink = document.getElementById("performance-intelligence");
  const adminNav = document.getElementById("admin-nav");
  const adminSubmenu = document.getElementById("admin-submenu");
  const adminUserRow = document.getElementById("admin-user-row");
  const adminUserSubmenu = document.getElementById("admin-user-submenu");
  const adminTargetRow = document.getElementById("admin-target-row");
  const adminTargetSubmenu = document.getElementById("admin-target-submenu");
  const adminOptions = document.querySelectorAll(".admin-option");
  const targetOptions = document.querySelectorAll(".target-option");
  const dashboardContainer = document.getElementById("dashboard-container");
  const sigmaIframeContainer = document.getElementById("sigma-iframe-container");
  const sigmaEmbedIframe = document.getElementById("sigma-embed-iframe");
  const homeNav = document.getElementById("home-nav");

  if (!analyzeNav || !analyzeSubmenu || !performanceLink) return;

  let hideTimeout;
  let selectedClient = "dnkn";

  const SIGMA_OPEN_TARGET_KEY = "sigmaOpenTarget";
  let sigmaOpenTarget =
    localStorage.getItem(SIGMA_OPEN_TARGET_KEY) === "iframe" ? "iframe" : "newTab";

  const allSubmenus = [analyzeSubmenu, adminSubmenu].filter(Boolean);
  const adminNestedSubmenus = [adminUserSubmenu, adminTargetSubmenu].filter(Boolean);

  function setupHoverSubmenu(triggerEl, submenuEl) {
    if (!triggerEl || !submenuEl) return;
    triggerEl.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
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

  function hideAllAdminSubmenus() {
    adminSubmenu?.classList.add("hidden");
    adminNestedSubmenus.forEach((m) => m?.classList.add("hidden"));
  }

  function setupAdminMenuHover() {
    // Show the admin submenu when entering the nav item
    adminNav?.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
      allSubmenus.forEach((m) => {
        if (m !== adminSubmenu) m.classList.add("hidden");
      });
      adminNestedSubmenus.forEach((m) => m.classList.add("hidden"));
      adminSubmenu?.classList.remove("hidden");
    });

    // Schedule hide ONLY when mouse leaves the entire admin-nav element.
    // All flyouts are DOM descendants of adminNav, so moving between them
    // never triggers adminNav's mouseleave — only truly exiting the admin
    // zone (going to another nav item or empty space) triggers it.
    adminNav?.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(hideAllAdminSubmenus, 150);
    });

    // Swap which nested flyout is visible when hovering User or Target rows
    adminUserRow?.addEventListener("mouseenter", () => {
      adminTargetSubmenu?.classList.add("hidden");
      adminUserSubmenu?.classList.remove("hidden");
    });

    adminTargetRow?.addEventListener("mouseenter", () => {
      adminUserSubmenu?.classList.add("hidden");
      adminTargetSubmenu?.classList.remove("hidden");
    });
  }

  setupHoverSubmenu(analyzeNav, analyzeSubmenu);
  setupAdminMenuHover();

  const pageTitle = document.getElementById("page-title");

  function updatePageTitle(client) {
    if (pageTitle) pageTitle.textContent = `Commerce Control Center (${client})`;
  }

  function applyTargetSelection() {
    targetOptions.forEach((opt) => {
      const target = opt.getAttribute("data-target");
      opt.classList.remove("bg-sky-100", "font-medium");
      if (target === sigmaOpenTarget) {
        opt.classList.add("bg-sky-100", "font-medium");
      }
    });
  }

  adminOptions.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.preventDefault();
      selectedClient = opt.getAttribute("data-client") || "dnkn";
      adminOptions.forEach((o) => o.classList.remove("bg-sky-100", "font-medium"));
      opt.classList.add("bg-sky-100", "font-medium");
      updatePageTitle(selectedClient);

      opt.classList.remove("admin-option-blink");
      opt.offsetHeight;
      opt.classList.add("admin-option-blink");
      setTimeout(() => {
        opt.classList.remove("admin-option-blink");
        hideAllAdminSubmenus();
      }, 350);
    });
  });

  targetOptions.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.preventDefault();
      const target = opt.getAttribute("data-target");
      if (target !== "newTab" && target !== "iframe") return;
      sigmaOpenTarget = target;
      localStorage.setItem(SIGMA_OPEN_TARGET_KEY, target);
      applyTargetSelection();

      opt.classList.remove("admin-option-blink");
      opt.offsetHeight;
      opt.classList.add("admin-option-blink");
      setTimeout(() => {
        opt.classList.remove("admin-option-blink");
        hideAllAdminSubmenus();
      }, 350);
    });
  });

  if (adminOptions.length) adminOptions[0].classList.add("bg-sky-100", "font-medium");
  applyTargetSelection();

  performanceLink.addEventListener("click", (e) => {
    e.preventDefault();
    fetch(`/api/embed-url?client=${encodeURIComponent(selectedClient)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to get embed URL");
        return res.json();
      })
      .then((data) => {
        if (!data.url) throw new Error("No URL in response");

        if (sigmaOpenTarget === "iframe") {
          dashboardContainer?.classList.add("hidden");
          sigmaIframeContainer?.classList.remove("hidden");
          if (sigmaEmbedIframe) sigmaEmbedIframe.src = data.url;
        } else {
          window.open(data.url, "_blank");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to open Performance Intelligence. Please try again.");
      });
  });

  homeNav?.addEventListener("click", (e) => {
    e.preventDefault();
    dashboardContainer?.classList.remove("hidden");
    sigmaIframeContainer?.classList.add("hidden");
    if (sigmaEmbedIframe) sigmaEmbedIframe.src = "";
  });
})();
