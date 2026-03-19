// Content wrapper - loads training data and injects main script

(function() {
  
  // Only run on olm.vn domain
  if (!window.location.hostname.includes('olm.vn')) {
    return;
  }
  
  // Get training data and API key from storage
  chrome.storage.local.get(['trainingDoc', 'apiKey'], function(result) {
    const trainingDoc = result.trainingDoc || '';
    const customApiKey = result.apiKey || '';
    
    // Store in window object BEFORE script loads
    // This avoids CSP inline script violation
    window.__OLM_TRAINING__ = trainingDoc;
    window.__OLM_API_KEY__ = customApiKey;
    
    // Inject main script
    const mainScript = document.createElement('script');
    mainScript.src = chrome.runtime.getURL('olm_cheat.js');
    mainScript.onload = function() {
      console.log('[OLM Cheat Extension] Main script loaded successfully!');
    };
    mainScript.onerror = function() {
      // Silent fail
    };
    
    (document.head || document.documentElement).appendChild(mainScript);
  });
})();