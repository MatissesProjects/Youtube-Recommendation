import { Storage, HistoryEntry, Creator, Suggestion } from './storage';
import { CONFIG } from './constants';

console.log('The Curator: Watcher script active.');

let currentVideoId: string | null = null;
let currentChannelId: string | null = null;
let currentChannelName: string | null = null;
let hasLoggedCurrentVideo = false;

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

async function logWatch(video: HTMLVideoElement) {
  if (hasLoggedCurrentVideo || !currentVideoId || !currentChannelId) return;

  const duration = video.duration;
  const currentTime = video.currentTime;
  if (!duration || isNaN(duration)) return;

  const completionRatio = currentTime / duration;
  
  if (Math.floor(currentTime) % 30 === 0) {
    console.log(`The Curator: Progress ${Math.round(completionRatio * 100)}% (${Math.round(currentTime)}/${Math.round(duration)}s)`);
  }

  if (completionRatio > CONFIG.COMPLETION_THRESHOLD || currentTime > CONFIG.MIN_WATCH_TIME_SECONDS) {
    console.log(`The Curator: Logging watch for ${currentVideoId} by ${currentChannelName}`);
    
    const keywords = getVideoKeywords();
    const videoTitle = getVideoTitle();
    const description = getVideoDescription();
    
    const descWords = description.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4);
    
    const wordFreq: Record<string, number> = {};
    const stopWordsSet = new Set(CONFIG.STOP_WORDS);
    
    descWords.forEach(w => {
      if (!stopWordsSet.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    
    const descKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);

    const combinedKeywords = [...new Set([...keywords, ...descKeywords])];

    const entry: HistoryEntry = {
      videoId: currentVideoId,
      channelId: currentChannelId,
      title: videoTitle,
      watchTime: currentTime,
      totalDuration: duration,
      timestamp: Date.now(),
      tags: combinedKeywords
    };

    await Storage.addHistoryEntry(entry);

    const creators = await Storage.getCreators();
    const existing = creators[currentChannelId];
    
    const existingKeywords = existing?.keywords || {};
    keywords.forEach(k => {
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
  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    hasLoggedCurrentVideo = false;
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
