document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enableToggle');
  const detectedPageEl = document.getElementById('detectedPage');
  
  // Load current enabled state
  const result = await chrome.storage.local.get('enabled');
  const enabled = result.enabled !== false; // default true
  enableToggle.checked = enabled;
  
  // Handle toggle changes
  enableToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ enabled: enableToggle.checked });
    
    // Send message to content script to enable/disable immediately
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('business.jawwalpay.ps')) {
        await chrome.tabs.sendMessage(tab.id, { 
          action: enableToggle.checked ? 'enableEnhancement' : 'disableEnhancement' 
        });
      }
    } catch (error) {
      console.error('Failed to send message to content script:', error);
    }
  });
  
  // Get detected page from active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('business.jawwalpay.ps')) {
      // Send message to content script to get detected page
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getDetectedPage' });
      if (response && response.page) {
        detectedPageEl.textContent = response.page;
      } else {
        detectedPageEl.textContent = 'Unknown (refresh page)';
      }
    } else {
      detectedPageEl.textContent = 'Not on Jawwal Pay';
    }
  } catch (error) {
    detectedPageEl.textContent = 'Unknown (refresh page)';
  }
});
