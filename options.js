// Options page script for OLM Cheat Extension

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('[OPTIONS] Loading saved settings...');
  
  chrome.storage.local.get(['trainingDoc', 'apiKey'], function(result) {
    if (result.trainingDoc) {
      document.getElementById('trainingDoc').value = result.trainingDoc;
      console.log('[OPTIONS] Loaded training doc:', result.trainingDoc.substring(0, 50) + '...');
    }
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
      console.log('[OPTIONS] Loaded API key:', result.apiKey.substring(0, 10) + '...');
    }
  });
  
  // Load toggle settings
  try {
    const autoUpdate = localStorage.getItem('olm_autoUpdate');
    const performanceMode = localStorage.getItem('olm_performanceMode');
    
    console.log('%c[OPTIONS] Loading toggles from localStorage:', 'color: #00d4ff; font-weight: bold;', {
      autoUpdate,
      performanceMode
    });
    
    if (autoUpdate !== null) {
      document.getElementById('autoUpdate').checked = autoUpdate === 'true';
      console.log('[OPTIONS] Auto Update loaded:', autoUpdate === 'true');
    } else {
      console.log('%c[OPTIONS] Auto Update NOT in localStorage (will be false by default)', 'color: #ffaa00;');
    }
    
    if (performanceMode !== null) {
      document.getElementById('performanceMode').checked = performanceMode === 'true';
      console.log('[OPTIONS] Performance Mode loaded:', performanceMode === 'true');
    } else {
      console.log('%c[OPTIONS] Performance Mode NOT in localStorage (will be false by default)', 'color: #ffaa00;');
    }
  } catch (error) {
    console.error('%c[OPTIONS] Load error:', 'color: #ff0000;', error);
  }
});

// Auto Update toggle
document.getElementById('autoUpdate').addEventListener('change', function() {
  const enabled = this.checked;
  console.log('%c[OPTIONS] Saving Auto Update:', 'color: #00ff00; font-weight: bold;', enabled);
  
  try {
    localStorage.setItem('olm_autoUpdate', enabled.toString());
    console.log('%c[OPTIONS] ✅ Auto Update saved:', 'color: #00ff00;', enabled);
    showSuccess('settingsSuccess');
    
    // Verify it was saved
    const stored = localStorage.getItem('olm_autoUpdate');
    console.log('%c[OPTIONS] Verification - stored value:', 'color: #00d4ff;', stored);
    
    reloadOLMTabs();
  } catch (error) {
    console.error('%c[OPTIONS] Save ERROR:', 'color: #ff0000; font-weight: bold;', error);
    alert('❌ Failed to save Auto Update: ' + error.message);
  }
});

// Performance Mode toggle
document.getElementById('performanceMode').addEventListener('change', function() {
  const enabled = this.checked;
  console.log('%c[OPTIONS] Saving Performance Mode:', 'color: #00ff00; font-weight: bold;', enabled);
  
  try {
    localStorage.setItem('olm_performanceMode', enabled.toString());
    console.log('%c[OPTIONS] ✅ Performance Mode saved:', 'color: #00ff00;', enabled);
    showSuccess('settingsSuccess');
    
    // Verify it was saved
    const stored = localStorage.getItem('olm_performanceMode');
    console.log('%c[OPTIONS] Verification - stored value:', 'color: #00d4ff;', stored);
    
    reloadOLMTabs();
  } catch (error) {
    console.error('%c[OPTIONS] Save ERROR:', 'color: #ff0000; font-weight: bold;', error);
    alert('❌ Failed to save Performance Mode: ' + error.message);
  }
});

// Helper to reload OLM tabs
function reloadOLMTabs() {
  setTimeout(function() {
    chrome.tabs.query({ url: ['*://olm.vn/*', '*://*.olm.vn/*'] }, function(tabs) {
      console.log('[OPTIONS] Reloading', tabs.length, 'OLM tabs');
      tabs.forEach(function(tab) {
        chrome.tabs.reload(tab.id);
      });
    });
  }, 500);
}

// Save API Key button
document.getElementById('saveApiKey').addEventListener('click', function() {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  console.log('[OPTIONS] Saving API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'EMPTY');
  
  chrome.storage.local.set({ apiKey: apiKey }, function() {
    if (chrome.runtime.lastError) {
      console.error('[OPTIONS] Save error:', chrome.runtime.lastError);
      alert('❌ Failed to save! ' + chrome.runtime.lastError.message);
      return;
    }
    
    console.log('[OPTIONS] API key saved!');
    showSuccess('apiKeySuccess');
    reloadOLMTabs();
  });
});

// Save Training Data button
document.getElementById('saveTraining').addEventListener('click', function() {
  const trainingDoc = document.getElementById('trainingDoc').value.trim();
  
  console.log('[OPTIONS] Saving training doc:', trainingDoc.length, 'chars');
  
  chrome.storage.local.set({ trainingDoc: trainingDoc }, function() {
    if (chrome.runtime.lastError) {
      console.error('[OPTIONS] Save error:', chrome.runtime.lastError);
      alert('❌ Failed to save! ' + chrome.runtime.lastError.message);
      return;
    }
    
    console.log('[OPTIONS] Saved! Reloading tabs...');
    showSuccess('trainingSuccess');
    
    // Reload all OLM tabs
    setTimeout(function() {
      chrome.tabs.query({ url: ['*://olm.vn/*', '*://*.olm.vn/*'] }, function(tabs) {
        console.log('[OPTIONS] Reloading', tabs.length, 'OLM tabs');
        tabs.forEach(function(tab) {
          chrome.tabs.reload(tab.id);
        });
      });
    }, 500);
  });
});

// Clear Training Data button
document.getElementById('clearTraining').addEventListener('click', function() {
  if (!confirm('Clear all training data?')) return;
  
  console.log('[OPTIONS] Clearing training data...');
  
  chrome.storage.local.set({ trainingDoc: '' }, function() {
    document.getElementById('trainingDoc').value = '';
    console.log('[OPTIONS] Training cleared!');
    showSuccess('trainingSuccess');
    
    // Reload all OLM tabs
    setTimeout(function() {
      chrome.tabs.query({ url: ['*://olm.vn/*', '*://*.olm.vn/*'] }, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.reload(tab.id);
        });
      });
    }, 500);
  });
});

// Show success message
function showSuccess(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'block';
    setTimeout(function() {
      element.style.display = 'none';
    }, 3000);
  }
}