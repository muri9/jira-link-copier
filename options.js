// Constants
const DEFAULT_FORMAT = '$html:<a href="$url">$ticket:$title</a>';

// Sample data for preview
const sampleData = {
  ticket: 'PROJ-123',
  title: 'Sample JIRA Issue',
  url: 'https://jira.company.com/browse/PROJ-123'
};

// Initialize the options page
function initializeOptions() {
  const elements = {
    formatInput: document.getElementById('format'),
    saveButton: document.getElementById('save'),
    resetButton: document.getElementById('reset'),
    successMessage: document.getElementById('successMessage'),
    previewResult: document.getElementById('previewResult')
  };

  // Validate that all elements exist
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Element not found: ${key}`);
      return;
    }
  }

  function updatePreview() {
    const format = elements.formatInput.value || DEFAULT_FORMAT;
    let preview = format
      .replace('$ticket', sampleData.ticket)
      .replace('$title', sampleData.title)
      .replace('$url', sampleData.url);
      
    if (preview.startsWith('$html:')) {
      preview = preview.substring(6);
    }
    
    elements.previewResult.innerHTML = preview;
  }

  function showSuccessMessage() {
    elements.successMessage.style.display = 'block';
    setTimeout(() => {
      elements.successMessage.style.display = 'none';
    }, 3000);
  }

  function validateFormat(format) {
    if (!format) return false;
    return format.includes('$ticket') || format.includes('$title') || format.includes('$url');
  }

  // Load saved settings
  chrome.storage.sync.get('format', (data) => {
    elements.formatInput.value = data.format || DEFAULT_FORMAT;
    updatePreview();
  });

  // Save settings
  elements.saveButton.addEventListener('click', () => {
    const format = elements.formatInput.value;
    
    if (!validateFormat(format)) {
      alert('Format must include at least one variable ($ticket, $title, or $url)');
      return;
    }

    chrome.storage.sync.set({ format }, () => {
      showSuccessMessage();
    });
  });

  // Reset to default
  elements.resetButton.addEventListener('click', () => {
    elements.formatInput.value = DEFAULT_FORMAT;
    updatePreview();
    chrome.storage.sync.set({ format: DEFAULT_FORMAT }, () => {
      showSuccessMessage();
    });
  });

  // Update preview on input
  elements.formatInput.addEventListener('input', updatePreview);

  // Handle keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      elements.saveButton.click();
    }
  });
}

// Ensure DOM is loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOptions);
} else {
  initializeOptions();
}