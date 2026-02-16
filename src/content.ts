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

function getVideoTitle(): string {
  return document.title.replace(' - YouTube', '').trim();
}

async function logWatch(video: HTMLVideoElement) {
  if (hasLoggedCurrentVideo || !currentVideoId || !currentChannelId) return;

  const duration = video.duration;
  const currentTime = video.currentTime;
  if (!duration || isNaN(duration)) return;

  const completionRatio = currentTime / duration;

  if (completionRatio > 0.8 || currentTime > 600) {
    console.log(`The Curator: Logging watch for ${currentVideoId} by ${currentChannelName}`);
    
    const keywords = getVideoKeywords();
    const videoTitle = getVideoTitle();
    console.log('The Curator: Extracted keywords:', keywords);
    console.log('The Curator: Extracted title:', videoTitle);

    const entry: HistoryEntry = {
      videoId: currentVideoId,
      channelId: currentChannelId,
      title: videoTitle,
      watchTime: currentTime,
      totalDuration: duration,
      timestamp: Date.now(),
      tags: keywords
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
    await Storage.saveCreator(creator);

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

function initWatcher() {
  const video = document.querySelector('video');
  const videoId = getVideoId();
  
  if (!video || !videoId) {
    console.log('The Curator: Waiting for video player...');
    return;
  }

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
