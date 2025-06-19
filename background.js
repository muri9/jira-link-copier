// Handle installation and updates
chrome.runtime.onInstalled.addListener(() => {
    // Set default format if not already set
    chrome.storage.sync.get('format', (data) => {
      if (!data.format) {
        chrome.storage.sync.set({
          format: '$html:<a href="$url">$ticket</a> $title'
        });
      }
    });
    // Open options page on install
    chrome.runtime.openOptionsPage();
  });
