(function () {
  const root = document.documentElement;
  const storageKey = root.dataset.acadiaThemeStorageKey || "acadia-theme";
  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  function isThemeMode(value) {
    return value === "light" || value === "dark";
  }

  function getStoredTheme() {
    try {
      const storedTheme = window.localStorage.getItem(storageKey);
      return isThemeMode(storedTheme) ? storedTheme : "system";
    } catch (_) {
      return "system";
    }
  }

  function getSystemTheme() {
    return mediaQuery && mediaQuery.matches ? "dark" : "light";
  }

  function getEffectiveTheme(mode) {
    return isThemeMode(mode) ? mode : getSystemTheme();
  }

  function setStoredTheme(mode) {
    try {
      if (isThemeMode(mode)) {
        window.localStorage.setItem(storageKey, mode);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch (_) {
      // Theme still applies for the current page when storage is unavailable.
    }
  }

  function updateToggle(toggle, preference, effectiveTheme) {
    const isDark = effectiveTheme === "dark";
    const nextTheme = isDark ? "light" : "dark";
    const icon = toggle.querySelector("[data-acadia-theme-toggle-icon]");

    toggle.classList.toggle("is-dark", isDark);
    toggle.classList.toggle("is-light", !isDark);
    toggle.dataset.acadiaThemePreference = preference;
    toggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.title = preference === "system" ? `System ${effectiveTheme} mode` : `${effectiveTheme[0].toUpperCase()}${effectiveTheme.slice(1)} mode`;

    if (icon) {
      icon.className = `fa-solid ${isDark ? "fa-toggle-on" : "fa-toggle-off"} acadia-icon`;
    }
  }

  function applyTheme(preference) {
    const nextPreference = isThemeMode(preference) ? preference : "system";
    const effectiveTheme = getEffectiveTheme(nextPreference);

    root.setAttribute("data-acadia-theme", nextPreference);

    if (root.hasAttribute("data-bs-theme")) {
      root.setAttribute("data-bs-theme", effectiveTheme);
    }

    document.querySelectorAll("[data-acadia-theme-toggle]").forEach((toggle) => {
      updateToggle(toggle, nextPreference, effectiveTheme);
    });

    document.querySelectorAll("[data-acadia-theme-select]").forEach((select) => {
      select.value = nextPreference;
    });
  }

  function initializeTheme() {
    applyTheme(getStoredTheme());

    document.querySelectorAll("[data-acadia-theme-toggle]").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const currentPreference = getStoredTheme();
        const currentTheme = getEffectiveTheme(currentPreference);
        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        setStoredTheme(nextTheme);
        applyTheme(nextTheme);
      });
    });

    document.querySelectorAll("[data-acadia-theme-select]").forEach((select) => {
      select.addEventListener("change", (event) => {
        const nextPreference = event.target.value;

        setStoredTheme(nextPreference);
        applyTheme(nextPreference);
      });
    });

    if (mediaQuery) {
      const handleSystemThemeChange = () => {
        if (getStoredTheme() === "system") {
          applyTheme("system");
        }
      };

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }
  }

  applyTheme(getStoredTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTheme);
  } else {
    initializeTheme();
  }
})();
