;(() => {
  const stored = localStorage.getItem("vite-ui-theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const dark = stored === "dark" || (stored !== "light" && prefersDark)
  document.documentElement.classList.add(dark ? "dark" : "light")
})()
