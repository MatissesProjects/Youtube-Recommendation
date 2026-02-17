import { Storage } from './storage';
import { Algorithm } from './algorithm';
import { VectorDB } from './vectorDb';

console.log('Background service worker started.');

// Offscreen management
let creating: any; // A global promise to avoid race conditions
async function setupOffscreenDocument(path: string) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await (chrome.runtime as any).getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) return;

  if (creating) {
    await creating;
  } else {
    creating = (chrome as any).offscreen.createDocument({
      url: path,
      reasons: ['LOCAL_STORAGE'], // We use this for AI/heavy tasks
      justification: 'Running local AI models for semantic embeddings'
    });
    await creating;
    creating = null;
  }
}

async function getEmbedding(text: string): Promise<number[] | null> {
  await setupOffscreenDocument('offscreen.html');
  const response = await chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'generateEmbedding',
    text
  });
  if (response && response.success) {
    return response.embedding;
  }
  return null;
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('The Curator extension installed. Setting up alarms...');
    setupAlarms();
  }
});

function setupAlarms() {
  // Track 2: The Tracker (RSS Poller) - runs once/day
  chrome.alarms.create('rss-poller', { periodInMinutes: 24 * 60 });
  // Track 3: The Algorithm - run every 4 hours to refresh scores
  chrome.alarms.create('score-updater', { periodInMinutes: 4 * 60 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'rss-poller') {
    pollRSS();
  } else if (alarm.name === 'score-updater') {
    updateScores();
  }
});

async function updateCreatorEmbeddings() {
  console.log('Background: Syncing semantic embeddings...');
  const creators = await Storage.getCreators();
  const topCreators = Object.values(creators)
    .sort((a, b) => {
      if (b.loyaltyScore !== a.loyaltyScore) {
        return b.loyaltyScore - a.loyaltyScore;
      }
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20); // Focus on top 20 for performance

  for (const creator of topCreators) {
    const existing = await VectorDB.getEmbedding(creator.id);
    if (!existing) {
      // Create a "vibe" string from keywords and name
      const keywords = Object.keys(creator.keywords || {}).slice(0, 10).join(' ');
      const vibeText = `${creator.name} ${keywords}`;
      console.log(`Background: Generating embedding for ${creator.name}`);
      const embedding = await getEmbedding(vibeText);
      if (embedding) {
        await VectorDB.saveEmbedding(creator.id, embedding);
      }
    }
  }
}

async function updateScores() {
  console.log('Updating loyalty scores...');
  const creators = await Storage.getCreators();
  const history = await Storage.getHistory();
  const updatedCreators = await Algorithm.updateAllScores(creators, history);
  await chrome.storage.local.set({ creators: updatedCreators });
  
  // Trigger embedding sync
  updateCreatorEmbeddings();
}

async function pollRSS() {
  console.log('Polling RSS for tracked creators...');
  const creators = await Storage.getCreators();
  const topCreators = Object.values(creators)
    .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
    .slice(0, 50);

  for (const creator of topCreators) {
    try {
      if (creator.id.startsWith('/channel/')) {
        const channelId = creator.id.replace('/channel/', '');
        const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
        const text = await response.text();
        
        // Extract latest video info
        const titleMatch = text.match(/<entry>[\s\S]*?<title>(.*?)<\/title>/);
        const idMatch = text.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
        const dateMatch = text.match(/<published>(.*?)<\/published>/);

        if (dateMatch && dateMatch[1]) {
          creator.lastUploadDate = new Date(dateMatch[1]).getTime();
          if (titleMatch && idMatch) {
            creator.latestVideo = {
              title: titleMatch[1],
              id: idMatch[1],
              published: creator.lastUploadDate
            };
          }
          await Storage.saveCreator(creator);
        }
      }
    } catch (error) {
      console.error(`Failed to poll RSS for ${creator.name}:`, error);
    }
  }
  await updateScores();
}

// Handle messages from Popup or Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'importHistory') {
    chrome.tabs.create({ url: 'https://www.youtube.com/feed/history' });
    // Note: The content script for history will handle the rest if it's matched in manifest
  } else if (message.action === 'refreshScores') {
    updateScores().then(() => sendResponse({ success: true }));
    return true; // async
  } else if (message.action === 'discover') {
    startDiscovery();
  }
});

async function startDiscovery() {
  const creators = await Storage.getCreators();
  const topCreators = Object.values(creators)
    .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
    .slice(0, 3);

  for (const creator of topCreators) {
    const url = `https://www.youtube.com${creator.id}/channels`;
    chrome.tabs.create({ url, active: false });
  }
}
