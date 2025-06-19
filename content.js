// JIRA Copy Link Content Script
(function() {
  let buttonAdded = false;
  let lastTicketId = null;
  let currentFormat = null;
  let lastNotificationId = null;

  // Create unique class names to avoid conflicts
  const BUTTON_CLASS = 'jira-copy-button-' + Math.random().toString(36).substr(2, 9);
  const ICON_CLASS = 'jira-copy-icon-' + Math.random().toString(36).substr(2, 9);

  // Inject styles immediately with unique classes
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .${BUTTON_CLASS} {
      cursor: pointer !important;
      margin-left: 4px !important;
      margin-right: 4px !important;
      padding: 4px !important;
      border: none !important;
      background: none !important;
      vertical-align: middle !important;
      display: inline-flex !important;
      align-items: center !important;
      opacity: 0.7 !important;
      transition: all 0.2s ease !important;
      position: relative !important;
      min-width: 24px !important;
      min-height: 24px !important;
    }

    .${BUTTON_CLASS}:hover {
      opacity: 1 !important;
      transform: scale(1.1) !important;
    }

    .${BUTTON_CLASS}:active {
      transform: scale(0.95) !important;
    }

    .${ICON_CLASS} {
      width: 16px !important;
      height: 16px !important;
      stroke-width: 2 !important;
      color: #42526E !important;
      display: inline-block !important;
      stroke: currentColor !important;
    }

    [data-theme="dark"] .${ICON_CLASS} {
      color: #B6C2CF !important;
    }

    /* Tooltip styles */
    .${BUTTON_CLASS}[title]:hover::after {
      content: attr(title);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 8px;
      background-color: #172B4D;
      color: white;
      font-size: 12px;
      white-space: nowrap;
      border-radius: 3px;
      margin-bottom: 4px;
      z-index: 10000;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .${BUTTON_CLASS}[title]:hover::before {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 4px solid transparent;
      border-top-color: #172B4D;
      margin-bottom: -4px;
      z-index: 10000;
    }
  `;
  document.head.appendChild(styleSheet);

  // Create button template with unique classes
  function createCopyButton() {
    const button = document.createElement('button');
    button.className = BUTTON_CLASS;
    button.title = 'Copy JIRA link';
    button.setAttribute('aria-label', 'Copy JIRA link');
    button.type = 'button'; // Explicitly set type
    button.innerHTML = `
      <svg class="${ICON_CLASS}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    return button;
  }

  // Improved title selectors with priority order
  const TITLE_SELECTORS = [
    // Modern JIRA
    {
      selector: '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
      getText: (el) => el.textContent.trim()
    },
    // Modern JIRA (alternative)
    {
      selector: 'h1[data-test-id="issue.views.issue-base.foundation.summary.heading"]',
      getText: (el) => el.textContent.trim()
    },
    // Classic JIRA
    {
      selector: '#summary-val',
      getText: (el) => el.textContent.trim()
    },
    // Legacy JIRA
    {
      selector: '.issue-header-content h1',
      getText: (el) => {
        const text = el.textContent.trim();
        const match = text.match(/^[A-Z]+-\d+\s*[-:]\s*(.+)$/);
        return match ? match[1].trim() : text;
      }
    }
  ];

  function showJiraNotification(content) {
    if (lastNotificationId) {
      try {
        AJS.flag.close(lastNotificationId);
      } catch (e) {
        // Ignore if already closed
      }
    }

    // Try modern JIRA notification
    if (window.FLAG_SERVICE) {
      try {
        lastNotificationId = window.FLAG_SERVICE.info({
          title: 'Link copied to clipboard',
          description: content,
          isAutoDismiss: true
        });
        return;
      } catch (e) {
        console.debug('Modern flag service failed, falling back to AUI');
      }
    }

    // Try classic JIRA notification
    if (window.AJS && window.AJS.flag) {
      try {
        lastNotificationId = AJS.flag({
          type: 'success',
          title: 'Link copied to clipboard',
          body: content,
          close: 'auto'
        });
        return;
      } catch (e) {
        console.debug('AUI flag service failed');
      }
    }

    // Fallback notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #00875A;
      color: white;
      padding: 16px;
      border-radius: 3px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
      word-break: break-word;
    `;
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">Link copied to clipboard</div>
      <div style="font-size: 12px;">${content}</div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function getTicketId() {
    // Try URL first
    const urlMatch = window.location.pathname.match(/[A-Z]+-\d+/);
    if (urlMatch) return urlMatch[0];

    // Try breadcrumb or issue key
    const keyElement = document.querySelector('#key-val, #issuekey-val');
    if (keyElement) {
      return keyElement.getAttribute('data-issue-key') || keyElement.textContent.trim();
    }

    return null;
  }

  function getIssueTitle() {
    for (const titleConfig of TITLE_SELECTORS) {
      const element = document.querySelector(titleConfig.selector);
      if (element) {
        const text = titleConfig.getText(element);
        if (text) return text;
      }
    }
    return null;
  }

  function findTicketTextElement() {
    const selectors = [
      // Classic JIRA key
      '#key-val',
      '#issuekey-val',
      // Modern JIRA project key
      //'[data-testid="issue.views.issue-base.foundation.summary.heading-container"] a',
      // Issue link
      //'a.issue-link[data-issue-key]',
      // Breadcrumb
      //'[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.match(/[A-Z]+-\d+/)) {
        return element;
      }
    }
    return null;
  }

  function extractTicketInfo() {
    const ticket = getTicketId();
    if (!ticket || ticket === lastTicketId) return null;
    
    const title = getIssueTitle();
    if (!title) return null;

    lastTicketId = ticket;
    return {
      ticket,
      title,
      url: window.location.origin + '/browse/' + ticket
    };
  }

  async function copyToClipboard(ticketInfo) {
    let html = currentFormat
      .replace('$ticket', ticketInfo.ticket)
      .replace('$title', ticketInfo.title)
      .replace('$url', ticketInfo.url);
      
    if (html.startsWith('$html:')) {
      html = html.substring(6);
    }

    try {
      const blob = new Blob([html], { type: 'text/html' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': new Blob([`${ticketInfo.ticket}: ${ticketInfo.title}`], 
            { type: 'text/plain' })
        })
      ]);
      showJiraNotification(html);
    } catch (err) {
      console.error('Copy failed:', err);
      const text = `${ticketInfo.ticket}: ${ticketInfo.title}\n${ticketInfo.url}`;
      await navigator.clipboard.writeText(text);
      showJiraNotification(text);
    }
  }

  function addCopyButton(ticketInfo) {
    if (buttonAdded) return;

    const ticketElement = findTicketTextElement();
    if (!ticketElement) return;

    const copyButton = createCopyButton();
    
    let previewText = currentFormat
      .replace('$ticket', ticketInfo.ticket)
      .replace('$title', ticketInfo.title)
      .replace('$url', ticketInfo.url);
    
    if (previewText.startsWith('$html:')) {
      previewText = previewText.substring(6);
    }
    
    copyButton.title = `Copy as: ${ticketInfo.ticket}: ${ticketInfo.title}`;

    // Insert button after ticket number
    if (ticketElement.tagName === 'A') {
      ticketElement.insertAdjacentElement('afterend', copyButton);
    } else {
      ticketElement.appendChild(copyButton);
    }

    buttonAdded = true;

    copyButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const freshTicketInfo = extractTicketInfo() || ticketInfo;
      await copyToClipboard(freshTicketInfo);
    });
  }

  function init() {
    const ticketInfo = extractTicketInfo();
    if (!ticketInfo) return;
    addCopyButton(ticketInfo);
  }

  // Listen for format updates
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'JIRA_COPIER_INIT') {
      currentFormat = event.data.format;
      init();
    }
  });

  // Watch for page changes
  const observer = new MutationObserver((mutations) => {
    if (currentFormat) {
      const shouldReinit = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return node.querySelector && (
              node.querySelector(TITLE_SELECTORS[0].selector) ||
              node.querySelector('#key-val') ||
              node.matches('[data-issue-key]')
            );
          }
          return false;
        });
      });

      if (shouldReinit) {
        buttonAdded = false;
        init();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
