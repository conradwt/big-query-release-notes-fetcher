// --- State Management ---
let releaseNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedUpdate = null;

// DOM Elements
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterPills = document.querySelectorAll('.filter-pill');
const notesContainer = document.getElementById('notesContainer');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const lastUpdatedText = document.getElementById('lastUpdatedText');
const statusDot = document.querySelector('.status-dot');

// Composer Modal Elements
const tweetComposer = document.getElementById('tweetComposer');
const closeComposerBtn = document.getElementById('closeComposerBtn');
const cancelComposerBtn = document.getElementById('cancelComposerBtn');
const postTweetBtn = document.getElementById('postTweetBtn');
const tweetTextArea = document.getElementById('tweetTextArea');
const modalTypeTag = document.getElementById('modalTypeTag');
const modalDateTag = document.getElementById('modalDateTag');
const modalTextPreview = document.getElementById('modalTextPreview');
const xTweetTextPreview = document.getElementById('xTweetTextPreview');
const charCounter = document.getElementById('charCounter');
const charProgressCircle = document.getElementById('charProgressCircle');
const limitWarning = document.getElementById('limitWarning');

// Progress Ring Configuration
const CIRCLE_RADIUS = 14;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// Initialize Progress Ring stroke
if (charProgressCircle) {
  charProgressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
  charProgressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

// --- Init Application ---
document.addEventListener('DOMContentLoaded', () => {
  fetchNotes();
  setupEventListeners();
  setupModalDismissFallback();
});

// --- API Calls ---
async function fetchNotes(refresh = false) {
  showState('loading');
  
  // Animate refresh button spinner
  const spinner = refreshBtn.querySelector('.spinner-icon');
  if (spinner) spinner.classList.add('spinning');
  refreshBtn.disabled = true;

  try {
    const response = await fetch(`/api/release-notes${refresh ? '?refresh=true' : ''}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    releaseNotes = data.entries || [];
    
    // Update footer status
    updateStatusIndicator('online', data.last_updated);
    
    // Render
    renderReleaseNotes();
  } catch (error) {
    console.error('Error fetching release notes:', error);
    updateStatusIndicator('error');
    errorMessage.textContent = `Could not load release notes: ${error.message}`;
    showState('error');
  } finally {
    if (spinner) spinner.classList.remove('spinning');
    refreshBtn.disabled = false;
  }
}

// --- Status Indicator UI Update ---
function updateStatusIndicator(status, timestamp = null) {
  statusDot.className = 'status-dot';
  if (status === 'online') {
    statusDot.classList.add('online');
    if (timestamp) {
      const date = new Date(timestamp);
      lastUpdatedText.textContent = `Last updated: ${date.toLocaleTimeString()}`;
    }
  } else if (status === 'error') {
    statusDot.classList.add('error');
    lastUpdatedText.textContent = 'Connection error';
  }
}

// --- State Views Management ---
function showState(state) {
  loadingState.style.display = state === 'loading' ? 'flex' : 'none';
  emptyState.style.display = state === 'empty' ? 'flex' : 'none';
  errorState.style.display = state === 'error' ? 'flex' : 'none';
  notesContainer.style.display = state === 'content' ? 'flex' : 'none';
}

// --- Filtering and Searching Logic ---
function getFilteredNotes() {
  if (!releaseNotes || releaseNotes.length === 0) return [];
  
  const query = searchQuery.toLowerCase().trim();
  
  return releaseNotes.map(entry => {
    // Filter the individual updates inside this date entry
    const filteredUpdates = entry.updates.filter(update => {
      // 1. Filter by Type
      const matchesFilter = activeFilter === 'all' || update.type.toLowerCase() === activeFilter;
      
      // 2. Filter by Search Query
      const matchesSearch = !query || 
        update.type.toLowerCase().includes(query) || 
        update.text.toLowerCase().includes(query);
        
      return matchesFilter && matchesSearch;
    });
    
    // Return a new entry object with only matching updates
    return {
      ...entry,
      updates: filteredUpdates
    };
  }).filter(entry => entry.updates.length > 0); // Only keep days that have matching updates
}

// --- Render Content ---
function renderReleaseNotes() {
  const filtered = getFilteredNotes();
  
  if (filtered.length === 0) {
    showState('empty');
    return;
  }
  
  notesContainer.innerHTML = '';
  
  filtered.forEach(entry => {
    const dateGroup = document.createElement('div');
    dateGroup.className = 'date-group';
    
    // Date Header
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-header';
    dateHeader.innerHTML = `<span>${entry.date}</span>`;
    dateGroup.appendChild(dateHeader);
    
    // Render Updates inside Date Group
    entry.updates.forEach(update => {
      const card = document.createElement('article');
      const tagClass = getTagClass(update.type);
      card.className = `update-card ${tagClass}`;
      
      // Card Header (Type & Share action)
      const cardHeader = document.createElement('div');
      cardHeader.className = 'update-header';
      
      const typeSpan = document.createElement('span');
      typeSpan.className = 'update-tag';
      typeSpan.textContent = update.type;
      
      const tweetBtn = document.createElement('button');
      tweetBtn.className = 'btn-tweet-action';
      tweetBtn.title = 'Compose tweet for this update';
      tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i>';
      tweetBtn.addEventListener('click', () => openTweetComposer(update, entry.date));
      
      cardHeader.appendChild(typeSpan);
      cardHeader.appendChild(tweetBtn);
      
      // Card Content HTML
      const cardContent = document.createElement('div');
      cardContent.className = 'update-content';
      cardContent.innerHTML = update.html;
      
      card.appendChild(cardHeader);
      card.appendChild(cardContent);
      dateGroup.appendChild(card);
    });
    
    notesContainer.appendChild(dateGroup);
  });
  
  showState('content');
}

// Helper for type-based class names
function getTagClass(type) {
  const t = type.toLowerCase();
  if (t === 'feature') return 'tag-feature';
  if (t === 'announcement') return 'tag-announcement';
  if (t === 'issue') return 'tag-issue';
  if (t === 'deprecation') return 'tag-deprecation';
  return 'tag-generic';
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Refresh Notes
  refreshBtn.addEventListener('click', () => fetchNotes(true));
  retryBtn.addEventListener('click', () => fetchNotes(true));
  
  // Search Box Inputs
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderReleaseNotes();
  });
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderReleaseNotes();
    searchInput.focus();
  });
  
  // Filter Pills Selection
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.getAttribute('data-filter');
      renderReleaseNotes();
    });
  });
  
  // Empty State Reset
  resetFiltersBtn.addEventListener('click', () => {
    // Clear search
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    // Clear filter pills
    filterPills.forEach(p => p.classList.remove('active'));
    filterPills[0].classList.add('active'); // Activate 'All'
    activeFilter = 'all';
    
    renderReleaseNotes();
  });
  
  // --- Tweet Composer Event Handlers ---
  tweetTextArea.addEventListener('input', handleComposerInput);
  
  closeComposerBtn.addEventListener('click', closeTweetComposer);
  cancelComposerBtn.addEventListener('click', closeTweetComposer);
  
  postTweetBtn.addEventListener('click', () => {
    const text = tweetTextArea.value;
    if (!text.trim()) return;
    
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    
    // Success Toast Notification
    showToast('Composer opened in X / Twitter!', 'success');
    closeTweetComposer();
  });
}

// --- Modal Handling ---
function openTweetComposer(update, date) {
  selectedUpdate = update;
  
  // Populate details
  modalTypeTag.textContent = update.type;
  modalTypeTag.className = `update-tag ${getTagClass(update.type)}`;
  modalDateTag.textContent = date;
  modalTextPreview.textContent = update.text;
  
  // Pre-fill composer
  tweetTextArea.value = update.tweet_text;
  
  // Update character count & UI state
  handleComposerInput();
  
  // Open dialog modal
  tweetComposer.showModal();
}

function closeTweetComposer() {
  tweetComposer.close();
  selectedUpdate = null;
}

// Composer dynamic input handler (Character count & live preview)
function handleComposerInput() {
  const text = tweetTextArea.value;
  const count = text.length;
  
  // Update textual counter
  charCounter.textContent = `${count} / 280`;
  
  // Update Twitter Mock Card Live Preview
  xTweetTextPreview.textContent = text || "Draft preview will appear here...";
  if (!text) {
    xTweetTextPreview.classList.add('muted');
  } else {
    xTweetTextPreview.classList.remove('muted');
  }
  
  // Character Limit Progress Ring math
  const limitFraction = Math.min(count / 280, 1);
  const strokeOffset = CIRCLE_CIRCUMFERENCE - (limitFraction * CIRCLE_CIRCUMFERENCE);
  charProgressCircle.style.strokeDashoffset = strokeOffset;
  
  // Dynamic color coding & limits
  if (count > 280) {
    charCounter.className = 'char-counter danger';
    charProgressCircle.style.stroke = 'var(--color-issue)';
    limitWarning.style.display = 'flex';
    // Let user compose beyond 280 but warn them, and do not disable
    // Twitter handles the tweet truncation anyway, but warning is better.
    postTweetBtn.disabled = false;
  } else if (count >= 250) {
    charCounter.className = 'char-counter warning';
    charProgressCircle.style.stroke = '#f59e0b'; // Amber warning
    limitWarning.style.display = 'none';
    postTweetBtn.disabled = false;
  } else {
    charCounter.className = 'char-counter';
    charProgressCircle.style.stroke = 'var(--color-gcp-blue)';
    limitWarning.style.display = 'none';
    postTweetBtn.disabled = text.trim() === '';
  }
}

// --- Fallback Dialog Light-Dismiss Support ---
// For Safari and older browsers that don't support `closedby="any"` declaratively
function setupModalDismissFallback() {
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    tweetComposer.addEventListener('click', (event) => {
      // Ignore click inside modal content
      if (event.target !== tweetComposer) return;
      
      // Check coordinate boundary
      const rect = tweetComposer.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      
      if (!isDialogContent) {
        closeTweetComposer();
      }
    });
  }
}

// --- Toast Notifications helper ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Auto-dismiss toast
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}
