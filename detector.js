// JIRA Detector
(function() {
    // Configuration
    const CONFIG = {
      MAX_ATTEMPTS: 20,
      OBSERVER_TIMEOUT: 2000,
      DEFAULT_FORMAT: '$html:<a href="$url">$ticket:$title</a>'
    };
  
    // State
    const state = {
      isJiraChecked: false,
      initAttempts: 0,
      observer: null
    };

    // Quick URL pattern checks
    function shouldInitialize() {
      // Check for JIRA paths
      let browseUrl = /browse/.test(window.location.href);
      if (browseUrl) {
        // Check for ticket pattern
        if (/[0-9A-Z]+-\d+/.test(window.location.href)) {
          return true;
        }
      }

      let boardUrl = /RapidBoard/.test(window.location.href)
      if (boardUrl) {
        return true;
      }

      //let issuesUrl = /issues/.test(window.location.href);
      //if (issuesUrl) {
      //  return true;
      //}

      return false;
    }
  
    // Fast check for JIRA indicators
    function quickJiraCheck() {
      return (
          document.getElementById('key-val') ||
          document.getElementById('issuekey-val') ||
          document.querySelector('[data-issue-key]')
          //|| document.querySelector('[data-testid*="issue"]')
      ) !== null;
    }
  
    // Load the content script
    function loadContentScript() {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content.js');
      script.type = 'text/javascript';
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => {
        script.remove();
        initializeContentScript();
      };
    }
  
    // Initialize content script with settings
    function initializeContentScript() {
      chrome.storage.sync.get('format', ({ format }) => {
        window.postMessage({ 
          type: 'JIRA_COPIER_INIT', 
          format: format || CONFIG.DEFAULT_FORMAT 
        }, '*');
      });
    }
  
    // Check and load main functionality
    function checkAndLoad() {
      if (state.isJiraChecked || state.initAttempts >= CONFIG.MAX_ATTEMPTS) return;
      
      state.initAttempts++;
      if (quickJiraCheck()) {
        state.isJiraChecked = true;
        loadContentScript();
        stopObserver();
      }
    }
  
    // Setup observer
    function setupObserver() {
      state.observer = new MutationObserver((mutations) => {
        checkAndLoad();
      });
  
      state.observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
  
      // Stop observing after timeout
      setTimeout(stopObserver, CONFIG.OBSERVER_TIMEOUT);
    }
  
    // Stop observer
    function stopObserver() {
      console.info('Copier stop observer');
      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }
    }
  
    // Setup message listeners
    function setupMessageListeners() {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'JIRA_COPIER_NOTIFICATION') {
          chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            title: event.data.title,
            message: event.data.message
          });
        }
      });
    }
  
    // Initialize
    function initialize() {
      if (!shouldInitialize()) return;
  
      setupMessageListeners();
      checkAndLoad();
      setupObserver();
    }
  
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  })();
