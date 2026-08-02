chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    const result = await chrome.storage.local.get('enabled');
    if (result.enabled === undefined) {
      await chrome.storage.local.set({ enabled: true });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[JawwalPay UX+] Background script received message:', request.action);
  
  if (request.action === 'getExtensionId') {
    sendResponse({ extensionId: chrome.runtime.id });
  } else if (request.action === 'getBackgroundImage') {
    console.log('[JawwalPay UX+] Background script fetching background image');
    const imageUrl = chrome.runtime.getURL('images/background_photo.jpg');
    console.log('[JawwalPay UX+] Image URL:', imageUrl);
    
    // Fetch the image from extension resources and convert to data URL
    fetch(imageUrl)
      .then(response => {
        console.log('[JawwalPay UX+] Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        console.log('[JawwalPay UX+] Blob size:', blob.size);
        const reader = new FileReader();
        reader.onloadend = function() {
          console.log('[JawwalPay UX+] Data URL length:', reader.result.length);
          sendResponse({ dataUrl: reader.result });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('[JawwalPay UX+] Background script error fetching image:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  return true;
});
