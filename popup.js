// Popup script
document.getElementById('openOptions').addEventListener('click', function() {
  if (chrome.runtime && chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    // Fallback - open in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }
});
