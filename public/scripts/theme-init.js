(function () {
  try {
    var storageKey = "droplet-theme-mode";
    var legacyStorageKey = "cellesseon-theme-mode";
    var savedMode =
      localStorage.getItem(storageKey) ||
      localStorage.getItem(legacyStorageKey) ||
      "system";
    var mode =
      savedMode === "light" || savedMode === "dark" ? savedMode : "system";
    var resolvedMode =
      mode === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode;
    document.documentElement.setAttribute("data-droplet-theme", resolvedMode);
  } catch {
    document.documentElement.setAttribute("data-droplet-theme", "light");
  }
})();
