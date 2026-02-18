import { Storage } from './storage';
import { Algorithm } from './algorithm';
import { VectorDB } from './vectorDb';
import { AIService } from './aiService';
import { EnrichmentService } from './enrichmentService';
import { CONFIG } from './constants';

console.log('Background service worker started.');

const currentlyResearching = new Set<string>();
let stopRequested = false;

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    setupAlarms();
  }
});

function setupAlarms() {
  chrome.alarms.create('rss-poller', { periodInMinutes: CONFIG.RSS_POLL_INTERVAL_MINS });
  chrome.alarms.create('score-updater', { periodInMinutes: CONFIG.SCORE_UPDATE_INTERVAL_MINS });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'rss-poller') pollRSS();
  if (alarm.name === 'score-updater') updateScores();
});

async function updateCreatorEmbeddings() {
  const creators = await Storage.getCreators();
  const topCreators = Object.values(creators)
    .sort((a, b) => {
      if (b.loyaltyScore !== a.loyaltyScore) return b.loyaltyScore - a.loyaltyScore;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.name.localeCompare(b.name);
    })
    .slice(0, CONFIG.EMBEDDING_SYNC_COUNT);

  for (const creator of topCreators) {
    const existing = await VectorDB.getEmbedding(creator.id);
    if (!existing) {
      const keywords = Object.keys(creator.keywords || {}).slice(0, 10).join(' ');
      const vibeText = `${creator.name} ${keywords}`;
      const embedding = await AIService.getEmbedding(vibeText);
      if (embedding) await VectorDB.saveEmbedding(creator.id, embedding);
    }
  }
}

async function updateHistoryEmbeddings() {
  console.log('Background: Syncing history semantic embeddings...');
  const history = await Storage.getHistory();
  // Focus on the most recent 50 entries for initial search capabilities
  const recentHistory = history.slice(-50);

  for (const entry of recentHistory) {
    const vectorId = `video:${entry.videoId}`;
    const existing = await VectorDB.getEmbedding(vectorId);
    if (!existing) {
      // Build a rich content string for the embedding
      const notesText = (entry.annotations || []).map(a => a.note).join(' ');
      const contentText = `${entry.title || ''} ${entry.summary || ''} ${notesText}`.trim();
      
      if (contentText.length > 10) {
        console.log(`Background: Indexing video concepts for ${entry.title || entry.videoId}`);
        const embedding = await AIService.getEmbedding(contentText);
        if (embedding) {
          await VectorDB.saveEmbedding(vectorId, embedding);
        }
      }
    }
  }
}

async function updateScores() {
  const creators = await Storage.getCreators();
  const history = await Storage.getHistory();
  const updatedCreators = await Algorithm.updateAllScores(creators, history);
  await chrome.storage.local.set({ creators: updatedCreators });
  
  // Trigger embedding syncs
  updateCreatorEmbeddings();
  updateHistoryEmbeddings();
}

async function pollRSS() {
  const settings = await Storage.getSettings();
  if (settings.isBotThrottledUntil > Date.now()) return;

  const creators = await Storage.getCreators();
  const topCreators = Object.values(creators)
    .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
    .slice(0, 50);

  for (const creator of topCreators) {
    try {
      if (creator.id.includes('/@') || creator.id.includes('/channel/')) {
        const channelId = creator.id.replace('/channel/', '').replace('/@', '');
        const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
        if (!response.ok) continue;
        const text = await response.text();
        
        const titleMatch = text.match(/<entry>[\s\S]*?<title>(.*?)<\/title>/);
        const idMatch = text.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
        const dateMatch = text.match(/<published>(.*?)<\/published>/);

        if (dateMatch) {
          creator.lastUploadDate = new Date(dateMatch[1]!).getTime();
          if (titleMatch && idMatch) {
            creator.latestVideo = { title: titleMatch[1]!, id: idMatch[1]!, published: creator.lastUploadDate };
          }
          await Storage.saveCreator(creator);
        }
      }
    } catch (e) { console.error(`RSS Fail: ${creator.name}`, e); }
  }
  updateScores();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'botCheckDetected') {
    stopRequested = true;
    const throttleUntil = Date.now() + (12 * 60 * 60 * 1000); // 12 hour cooling off
    Storage.getSettings().then(settings => {
      Storage.saveSettings({ ...settings, isBotThrottledUntil: throttleUntil });
    });
    console.error('The Curator: Bot check detected. Researching paused.');
  }
  else if (message.action === 'importHistory') chrome.tabs.create({ url: 'https://www.youtube.com/feed/history' });
  else if (message.action === 'refreshScores') {
    updateScores().then(() => sendResponse({ success: true }));
    return true;
  }
  else if (message.action === 'discover') startDiscovery();
  else if (message.action === 'startResearch') startResearch(message.ids);
  else if (message.action === 'processResearch') {
    processResearch(message.creatorName, message.data, sender.tab?.id);
  }
});

async function processResearch(name: string, data: string, tabId?: number) {
  const creators = await Storage.getCreators();
  // Match by name
  const creator = Object.values(creators).find(c => c.name === name);
  if (creator) {
    console.log(`Background: Processing research for ${name}`);
    await EnrichmentService.enrichCreator(creator.id, data);
    currentlyResearching.delete(creator.id);
    
    if (tabId) {
      // Close the tab automatically after successful processing
      setTimeout(() => {
        chrome.tabs.remove(tabId);
      }, 1000);
    }
  }
}

async function startResearch(targetIds?: string[]) {
  const settings = await Storage.getSettings();
  if (settings.isBotThrottledUntil > Date.now()) {
    const hoursLeft = Math.ceil((settings.isBotThrottledUntil - Date.now()) / (1000 * 60 * 60));
    console.warn(`The Curator [Research]: Throttled due to previous bot check. Resuming in ~${hoursLeft} hours.`);
    return;
  }

  stopRequested = false;
  const creators = await Storage.getCreators();
  let list = [];
  
  const isQualityEnriched = (c: any) => {
    if (!c.enrichedDescription) return false;
    const desc = c.enrichedDescription.toLowerCase();
    // Allow re-researching if it's just the fallback or mentions "unknown"
    if (desc === "search-enriched profile." || desc.includes('unknown creator')) return false;
    return true;
  };

  if (targetIds && targetIds.length > 0) {
    list = targetIds.map(id => creators[id]).filter(c => c && !isQualityEnriched(c) && !currentlyResearching.has(c.id));
  } else {
    // Sort by frequency (most data) then loyaltyScore
    list = Object.values(creators)
      .sort((a, b) => {
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        return b.loyaltyScore - a.loyaltyScore;
      })
      .filter(c => !isQualityEnriched(c) && !currentlyResearching.has(c.id))
      .slice(0, 10); // Batch of 10
  }

  if (list.length === 0) {
    console.log('The Curator [Research]: All quality profiles already built or currently in progress.');
    return;
  }

  console.log(`The Curator [Research]: Starting batch for ${list.length} creators (Priority: Highest Frequency).`);

  for (let i = 0; i < list.length; i++) {
    if (stopRequested) {
      console.warn('The Curator [Research]: Stopping batch execution as requested.');
      break;
    }

    const creator = list[i];
    currentlyResearching.add(creator.id);
    const query = `youtube channel ${creator.name} general channel information`;
    
    console.log(`The Curator [Research] [${i+1}/${list.length}]: Searching for "${creator.name}" (Watched ${creator.frequency} times)...`);
    
    chrome.tabs.create({ 
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, 
      active: false 
    });

    const delay = 15000 + (Math.random() * 15000);
    if (i < list.length - 1) {
        console.log(`The Curator [Research]: Pausing for ${Math.round(delay/1000)}s to remain stealthy...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  if (!stopRequested) console.log('The Curator [Research]: Batch complete.');
}

async function startDiscovery() {
  const creators = await Storage.getCreators();
  const topCreators = Object.values(creators)
    .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
    .slice(0, 3);

  for (const creator of topCreators) {
    chrome.tabs.create({ url: `https://www.youtube.com${creator.id}/channels`, active: false });
  }
}
