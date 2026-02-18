import { Storage, HistoryEntry, Creator, Suggestion } from './storage';
import { CONFIG, SELECTORS } from './constants';
import { SponsorSegment } from './types';
import { extractKeywords } from './utils';

console.log('The Curator: Watcher script active.');

let currentVideoId: string | null = null;
let currentChannelId: string | null = null;
let currentChannelName: string | null = null;
let hasLoggedCurrentVideo = false;
let currentSegments: SponsorSegment[] = [];

async function applyFocusMode() {
  const settings = await Storage.getSettings();
  const id = 'curator-focus-mode-styles';
  let style = document.getElementById(id);

  if (settings.focusMode) {
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      // Hide homepage feed, sidebar, and end screen suggestions
      style.textContent = `
        ytd-rich-grid-renderer, 
        #related, 
        .ytp-endscreen-content, 
        ytd-browse[page-subtype="home"] #contents,
        ytd-watch-next-secondary-results-renderer { 
          display: none !important; 
        }
        #primary { max-width: 100% !important; }
      `;
      document.head.appendChild(style);
    }
  } else if (style) {
    style.remove();
  }
}

async function applyDeHype() {
  const settings = await Storage.getSettings();
  if (!settings.deHype) return;

  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, ytd-watch-metadata #title h1');
  if (!titleElement) return;

  const originalTitle = (titleElement.textContent || '').trim();
  
  // Detection for "Hype": 
  // 1. More than 3 emojis
  // 2. Mostly ALL CAPS (more than 50% uppercase and > 10 chars)
  const emojiCount = (originalTitle.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D/g) || []).length;
  const upperCaseCount = (originalTitle.match(/[A-Z]/g) || []).length;
  const isAllCaps = upperCaseCount > (originalTitle.length * 0.5) && originalTitle.length > 10;

  if (emojiCount > 2 || isAllCaps) {
    if (titleElement.getAttribute('data-dehype-done')) return;
    
    console.log('The Curator: De-Hyping title...');
    
    // Try to get a clean title
    const prompt = `Rewrite this YouTube title to be objective and calm, removing clickbait, all-caps, and excessive emojis: "${originalTitle}"`;
    
    let cleanTitle = originalTitle;
    try {
      // @ts-ignore
      if (typeof window.ai !== 'undefined' && window.ai.createTextSession) {
        // @ts-ignore
        const session = await window.ai.createTextSession();
        cleanTitle = await session.prompt(prompt);
      }
    } catch (e) {
      // Fallback: Just lowercase and remove extra symbols
      cleanTitle = originalTitle.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\b([a-z])([a-z]+)/g, (m, g1, g2) => g1.toUpperCase() + g2);
    }

    if (cleanTitle !== originalTitle) {
      const container = titleElement.parentElement;
      if (container && !document.getElementById('curator-original-title')) {
        const originalDisplay = document.createElement('div');
        originalDisplay.id = 'curator-original-title';
        originalDisplay.style.cssText = 'font-size: 0.7em; color: #666; font-style: italic; margin-bottom: 4px;';
        originalDisplay.textContent = `Original: ${originalTitle}`;
        container.insertBefore(originalDisplay, titleElement);
        
        (titleElement as HTMLElement).innerText = cleanTitle;
        titleElement.setAttribute('data-dehype-done', 'true');
        (titleElement as HTMLElement).style.color = '#1a73e8';
      }
    }
  }
}

async function fetchSponsorSegments(videoId: string) {
  try {
    const response = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=["sponsor","selfpromo","interaction","intro","outro","preview","filler","music_offtopic"]`);
    if (response.ok) {
      const data = await response.json();
      currentSegments = data.map((s: any) => ({
        category: s.category,
        start: s.segment[0],
        end: s.segment[1]
      }));
      console.log(`The Curator: Found ${currentSegments.length} filler segments for this video.`);
    } else {
      currentSegments = [];
    }
  } catch (e) {
    currentSegments = [];
  }
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function getChannelInfo() {
  const selectors = [
    'ytd-video-owner-renderer a.yt-simple-endpoint',
    '#owner #channel-name a',
    'ytd-video-secondary-info-renderer #channel-name a'
  ];
  
  for (const selector of selectors) {
    const link = document.querySelector(selector);
    if (link) {
      const href = link.getAttribute('href');
      const name = (link.textContent || '').trim();
      if (href && name) return { id: href, name: name };
    }
  }
  return null;
}

function getVideoKeywords(): string[] {
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const content = metaKeywords.getAttribute('content');
    if (content) return content.split(',').map(s => s.trim().toLowerCase());
  }

  const title = document.title.replace(' - YouTube', '').toLowerCase();
  const stopWordsSet = new Set(CONFIG.STOP_WORDS);
  return title.split(/\s+/).filter(w => w.length > 3 && !stopWordsSet.has(w));
}

function getVideoDescription(): string {
  const descriptionElement = document.querySelector('#description-text, .ytd-video-secondary-info-renderer #description, ytd-expandable-video-description-body-renderer');
  return (descriptionElement?.textContent || '').trim();
}

function getVideoTitle(): string {
  return document.title.replace(' - YouTube', '').trim();
}

let lastLogCheck = 0;
let lastProgressLog = 0;

async function logWatch(video: HTMLVideoElement) {
  const now = Date.now();
  if (now - lastLogCheck < 1000) return; // Throttle to 1s
  lastLogCheck = now;

  if (hasLoggedCurrentVideo || !currentVideoId || !currentChannelId) return;

  const duration = video.duration;
  const currentTime = video.currentTime;
  if (!duration || isNaN(duration)) return;

  // Calculate True Duration (Total - Fluff)
  const fluffTime = currentSegments.reduce((acc, s) => acc + (s.end - s.start), 0);
  const trueDuration = Math.max(1, duration - fluffTime);
  
  // Note: Skipping fluff segments doesn't penalize you.
  const completionRatio = currentTime / trueDuration;
  
  if (currentTime - lastProgressLog >= 30) {
    console.log(`The Curator: Progress ${Math.round(completionRatio * 100)}% (True Duration: ${Math.round(trueDuration)}s)`);
    lastProgressLog = currentTime;
  }

  if (completionRatio > CONFIG.COMPLETION_THRESHOLD || currentTime > CONFIG.MIN_WATCH_TIME_SECONDS) {
    console.log(`The Curator: Logging TRUE watch for ${currentVideoId} by ${currentChannelName}`);
    
    const keywords = getVideoKeywords();
    const videoTitle = getVideoTitle();
    const description = getVideoDescription();
    
    const descKeywords = extractKeywords(description, CONFIG.STOP_WORDS);
    const combinedKeywords = [...new Set([...keywords, ...descKeywords])];

    const entry: HistoryEntry = {
      videoId: currentVideoId,
      channelId: currentChannelId,
      title: videoTitle,
      watchTime: currentTime,
      totalDuration: duration,
      trueDuration: trueDuration,
      timestamp: Date.now(),
      tags: combinedKeywords,
      segments: currentSegments
    };

    await Storage.addHistoryEntry(entry);

    const creators = await Storage.getCreators();
    const existing = creators[currentChannelId];
    
    const existingKeywords = existing?.keywords || {};
    // Store both meta/title keywords AND top description keywords for better clustering
    combinedKeywords.forEach(k => {
      existingKeywords[k] = (existingKeywords[k] || 0) + 1;
    });

    const creator: Creator = {
      id: currentChannelId,
      name: currentChannelName || 'Unknown',
      loyaltyScore: existing ? existing.loyaltyScore : 0,
      frequency: (existing ? existing.frequency : 0) + 1,
      lastUploadDate: existing?.lastUploadDate,
      keywords: existingKeywords
    };
    
    creators[currentChannelId] = creator;
    await chrome.storage.local.set({ creators });

    hasLoggedCurrentVideo = true;
  }
}

async function scrapeSidebar() {
  const sidebarItems = document.querySelectorAll(SELECTORS.SIDEBAR_ITEMS);
  const suggestions: Suggestion[] = await Storage.getSuggestions();
  const creators = await Storage.getCreators();
  let addedCount = 0;
  
  for (const item of Array.from(sidebarItems)) {
    const links = Array.from(item.querySelectorAll('a'));
    const channelLink = links.find(a => {
      const href = a.getAttribute('href') || '';
      return (href.includes('/@') || href.includes('/channel/')) && !href.includes('watch?v=');
    });

    if (channelLink) {
      const channelId = channelLink.getAttribute('href');
      const channelName = (channelLink.textContent || '').trim();
      if (channelId) {
        const isKnown = !!creators[channelId];
        const isAlreadySuggested = !!suggestions.find(s => s.channelId === channelId);

        if (!isKnown && !isAlreadySuggested) {
          suggestions.push({
            channelId,
            reason: `Suggested alongside ${currentChannelName || 'current video'}`,
            status: 'new'
          });
          addedCount++;
          
          (item as HTMLElement).style.position = 'relative';
          const indicator = document.createElement('div');
          indicator.style.cssText = 'width:10px; height:10px; background:#2ba640; border-radius:50%; position:absolute; top:5px; right:5px; z-index:100; border:1px solid white;';
          item.appendChild(indicator);
        } else {
          (item as HTMLElement).style.position = 'relative';
          const indicator = document.createElement('div');
          indicator.style.cssText = 'width:8px; height:8px; background:#065fd4; border-radius:50%; position:absolute; top:5px; right:5px; z-index:100; opacity: 0.5;';
          item.appendChild(indicator);
        }
      }
    }
  }
  
  if (addedCount > 0) await Storage.saveSuggestions(suggestions);
}

function injectNoteUI() {
  if (document.getElementById('curator-note-btn')) return;
  const rightControls = document.querySelector('.ytp-right-controls');
  if (!rightControls) return;

  const noteBtn = document.createElement('button');
  noteBtn.id = 'curator-note-btn';
  noteBtn.className = 'ytp-button';
  noteBtn.innerHTML = '📝';
  noteBtn.style.fontSize = '1.2em';
  noteBtn.style.verticalAlign = 'top';

  const overlay = document.createElement('div');
  overlay.id = 'curator-note-overlay';
  overlay.style.cssText = 'display:none; position:absolute; bottom:60px; right:10px; background:#fff; padding:10px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.3); z-index:9999; width:250px;';
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Your note...';
  textarea.style.cssText = 'width:100%; height:80px; margin-bottom:5px; border:1px solid #ddd; border-radius:4px; font-family:sans-serif; padding:5px; box-sizing:border-box;';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save Note';
  saveBtn.style.cssText = 'width:100%; background:#1a73e8; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer; font-weight:bold;';
  overlay.appendChild(textarea);
  overlay.appendChild(saveBtn);
  document.querySelector('.html5-video-player')?.appendChild(overlay);

  noteBtn.onclick = () => {
    overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
    if (overlay.style.display === 'block') textarea.focus();
  };

  saveBtn.onclick = async () => {
    const video = document.querySelector('video');
    const videoId = getVideoId();
    if (video && videoId && textarea.value.trim()) {
      await Storage.addAnnotation(videoId, { timestamp: video.currentTime, note: textarea.value.trim() });
      textarea.value = '';
      overlay.style.display = 'none';
      noteBtn.innerHTML = '✅';
      setTimeout(() => { noteBtn.innerHTML = '📝'; }, 2000);
    }
  };
  rightControls.insertBefore(noteBtn, rightControls.firstChild);
}

function initWatcher() {
  const video = document.querySelector('video');
  const videoId = getVideoId();
  if (!video || !videoId) return;
  injectNoteUI();
  applyFocusMode();
  applyDeHype();
  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    hasLoggedCurrentVideo = false;
    currentSegments = [];
    fetchSponsorSegments(videoId);
    
    let retries = 0;
    const infoInterval = setInterval(() => {
      const info = getChannelInfo();
      if (info || retries > 10) {
        if (info) {
          currentChannelId = info.id;
          currentChannelName = info.name;
        }
        clearInterval(infoInterval);
        setTimeout(scrapeSidebar, 3000);
      }
      retries++;
    }, 1000);
  }
  video.ontimeupdate = () => logWatch(video);
  video.onended = () => logWatch(video);
  video.onpause = () => logWatch(video);
}

let lastUrl = location.href;
const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(initWatcher, 2000);
  }
});
navObserver.observe(document, { subtree: true, childList: true });
setTimeout(initWatcher, 3000);

chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    applyFocusMode();
    applyDeHype();
  }
});
