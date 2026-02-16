import { Storage, HistoryEntry, Creator, Suggestion } from './storage';

console.log('The Curator content script loaded.');

let currentVideoId: string | null = null;
let currentChannelId: string | null = null;
let currentChannelName: string | null = null;
let watchStartTime: number = 0;
let lastLoggedVideoId: string | null = null;
let hasLoggedCurrentVideo = false;

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function getChannelInfo() {
  const channelLink = document.querySelector('ytd-video-owner-renderer a.yt-simple-endpoint');
  if (channelLink) {
    const href = channelLink.getAttribute('href');
    const name = (channelLink.textContent || '').trim();
    // href is usually /@channelname or /channel/ID
    return { id: href, name: name };
  }
  return null;
}

async function logWatch(video: HTMLVideoElement) {
  if (hasLoggedCurrentVideo || !currentVideoId || !currentChannelId) return;

  const duration = video.duration;
  const currentTime = video.currentTime;
  const completionRatio = currentTime / duration;

  // Logic: Only log "watch" if (currentTime / duration) > 0.8 (80% completion) OR time > 10 mins (600s)
  if (completionRatio > 0.8 || currentTime > 600) {
    console.log(`Logging watch for ${currentVideoId} by ${currentChannelName}`);
    
    const entry: HistoryEntry = {
      videoId: currentVideoId,
      channelId: currentChannelId,
      watchTime: currentTime,
      totalDuration: duration,
      timestamp: Date.now()
    };

    await Storage.addHistoryEntry(entry);

    // Also update/add creator
    const creators = await Storage.getCreators();
    const existingCreator = creators[currentChannelId];
    
    const creator: Creator = {
      id: currentChannelId,
      name: currentChannelName || 'Unknown',
      loyaltyScore: existingCreator ? existingCreator.loyaltyScore : 0, // Score calculation will happen in Track 3
      lastUploadDate: existingCreator?.lastUploadDate
    };
    await Storage.saveCreator(creator);

    hasLoggedCurrentVideo = true;
    lastLoggedVideoId = currentVideoId;
  }
}

async function scrapeSidebar() {
  const sidebarItems = document.querySelectorAll('ytd-compact-video-renderer, ytd-rich-item-renderer');
  const suggestions: Suggestion[] = await Storage.getSuggestions();
  const creators = await Storage.getCreators();
  
  for (const item of Array.from(sidebarItems)) {
    const channelLink = item.querySelector('ytd-channel-name a, #channel-name a, .ytd-channel-name a') as HTMLAnchorElement;
    if (channelLink) {
      const channelId = channelLink.getAttribute('href');
      const channelName = (channelLink.textContent || '').trim();
      
      if (channelId) {
        // If we already know this creator, maybe boost them (future logic)
        // If they are new, add to suggestions
        if (!creators[channelId] && !suggestions.find(s => s.channelId === channelId)) {
          suggestions.push({
            channelId,
            reason: `Suggested alongside ${currentChannelName || 'current video'}`,
            status: 'new'
          });
        }
      }
    }
  }
  await Storage.saveSuggestions(suggestions);
}

function initWatcher() {
  const video = document.querySelector('video');
  if (!video) return;

  const videoId = getVideoId();
  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    hasLoggedCurrentVideo = false;
    
    // Try to get channel info
    const channelInfo = getChannelInfo();
    if (channelInfo) {
      currentChannelId = channelInfo.id || 'unknown';
      currentChannelName = channelInfo.name;
    }
    
    // Scrape sidebar after a short delay
    setTimeout(scrapeSidebar, 5000);
  }

  video.ontimeupdate = () => logWatch(video);
}

// YouTube is a SPA, so we need to watch for navigation
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    currentVideoId = null;
    hasLoggedCurrentVideo = false;
    initWatcher();
  }
}).observe(document, { subtree: true, childList: true });

// Initial call
setTimeout(initWatcher, 2000); // Give it some time to load
