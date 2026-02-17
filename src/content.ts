import { Storage, HistoryEntry, Creator, Suggestion } from './storage';

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
  // Newer YouTube layout selectors for channel link
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
  // Scrape keywords from meta tags or title
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const content = metaKeywords.getAttribute('content');
    if (content) return content.split(',').map(s => s.trim().toLowerCase());
  }

  // Fallback: simple title extraction (exclude common stop words)
  const title = document.title.replace(' - YouTube', '').toLowerCase();
  const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'of', 'for', 'to', 'and', 'video', 'youtube']);
  return title.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
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
  
  // Every 10% progress, log a quiet heartbeat to console for debugging
  if (Math.floor(currentTime) % 30 === 0) {
    console.log(`The Curator: Progress ${Math.round(completionRatio * 100)}% (${Math.round(currentTime)}/${Math.round(duration)}s)`);
  }

  if (completionRatio > 0.8 || currentTime > 600) {
    console.log(`The Curator: Logging watch for ${currentVideoId} by ${currentChannelName}`);
    
    const keywords = getVideoKeywords();
    const videoTitle = getVideoTitle();
    const description = getVideoDescription();
    
    // Deeper Keyword Extraction: Frequency analysis of description
    const descWords = description.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4);
    
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(['google', 'youtube', 'http', 'https', 'www', 'video', 'channel', 'subscribe', 'social', 'media', 'twitter', 'instagram', 'facebook']);
    
    descWords.forEach(w => {
      if (!stopWords.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    
    const descKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);

    const combinedKeywords = [...new Set([...keywords, ...descKeywords])];

    console.log('The Curator: Deep context keywords:', combinedKeywords);

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
    
    // Update creator's keyword profile
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
  // Look for any video-like items in the sidebar or below the player
  const sidebarItems = document.querySelectorAll('ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model');
  console.log(`The Curator: Sidebar scan found ${sidebarItems.length} items.`);
  
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
          
          // Visual indicator
          (item as HTMLElement).style.position = 'relative';
          const indicator = document.createElement('div');
          indicator.className = 'curator-found-dot';
          indicator.style.cssText = 'width:10px; height:10px; background:#2ba640; border-radius:50%; position:absolute; top:5px; right:5px; z-index:100; border:1px solid white;';
          item.appendChild(indicator);
        } else {
          // If known, show a different color dot (blue for "recognized")
          (item as HTMLElement).style.position = 'relative';
          const indicator = document.createElement('div');
          indicator.style.cssText = 'width:8px; height:8px; background:#065fd4; border-radius:50%; position:absolute; top:5px; right:5px; z-index:100; opacity: 0.5;';
          item.appendChild(indicator);
        }
      }
    }
  }
  
  if (addedCount > 0) {
    console.log(`The Curator: Added ${addedCount} new suggestions.`);
    await Storage.saveSuggestions(suggestions);
  } else {
    console.log('The Curator: Sidebar scan complete. All creators already known or suggested.');
  }
}

function injectNoteUI() {
  if (document.getElementById('curator-note-btn')) return;

  const rightControls = document.querySelector('.ytp-right-controls');
  if (!rightControls) return;

  const noteBtn = document.createElement('button');
  noteBtn.id = 'curator-note-btn';
  noteBtn.className = 'ytp-button';
  noteBtn.innerHTML = '📝';
  noteBtn.title = 'Take a Curator Note';
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
      await Storage.addAnnotation(videoId, {
        timestamp: video.currentTime,
        note: textarea.value.trim()
      });
      console.log('The Curator: Note saved at', video.currentTime);
      textarea.value = '';
      overlay.style.display = 'none';
      // Visual feedback
      noteBtn.innerHTML = '✅';
      setTimeout(() => { noteBtn.innerHTML = '📝'; }, 2000);
    }
  };

  rightControls.insertBefore(noteBtn, rightControls.firstChild);
}

function initWatcher() {
  const video = document.querySelector('video');
  const videoId = getVideoId();
  
  if (!video || !videoId) {
    console.log('The Curator: Waiting for video player...');
    return;
  }

  // Inject Note UI
  injectNoteUI();

  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    hasLoggedCurrentVideo = false;
    
    // Retry finding channel info since it loads after the video
    let retries = 0;
    const infoInterval = setInterval(() => {
      const info = getChannelInfo();
      if (info || retries > 10) {
        if (info) {
          currentChannelId = info.id;
          currentChannelName = info.name;
          console.log(`The Curator: Now watching ${currentChannelName} (${currentVideoId})`);
        }
        clearInterval(infoInterval);
        setTimeout(scrapeSidebar, 3000);
      }
      retries++;
    }, 1000);
  }

  video.ontimeupdate = () => logWatch(video);
  video.onended = () => {
    console.log('The Curator: Video ended, checking for completion...');
    logWatch(video);
  };
  video.onpause = () => {
    console.log('The Curator: Video paused, checking for completion...');
    logWatch(video);
  };
  console.log('The Curator: Watcher initialized for current video.');
}

// Global observer for navigation (YouTube is a SPA)
let lastUrl = location.href;
const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('The Curator: Navigation detected');
    setTimeout(initWatcher, 2000);
  }
});
navObserver.observe(document, { subtree: true, childList: true });

// Initial Load
setTimeout(initWatcher, 3000);
