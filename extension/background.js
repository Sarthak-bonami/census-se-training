// Clicking the toolbar icon opens the side panel (which keeps answers in memory
// while it stays open — unlike a popup, which is destroyed on every blur).
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn("sidePanel behavior:", err));
