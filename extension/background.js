// Open side panel upon clicking extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] SidePanel behavior error:', error));
