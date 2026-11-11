(function () {
  try {
    var saved = JSON.parse(localStorage.getItem("aevora-theme") || "{}");
    var pref = (saved.state && saved.state.theme) || "dark";
    var dark =
      pref === "dark" ||
      (pref === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
