import { Storage } from './storage';
import { Algorithm } from './algorithm';
import { VectorDB } from './vectorDb';
import { AIService } from './aiService';
import { CONFIG } from './constants';

console.log('Background service worker started.');

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

async function updateScores() {
  const creators = await Storage.getCreators();
  const history = await Storage.getHistory();
  const updatedCreators = await Algorithm.updateAllScores(creators, history);
  await chrome.storage.local.set({ creators: updatedCreators });
  updateCreatorEmbeddings();
}

async function pollRSS() {
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
  if (message.action === 'importHistory') chrome.tabs.create({ url: 'https://www.youtube.com/feed/history' });
  else if (message.action === 'refreshScores') {
    updateScores().then(() => sendResponse({ success: true }));
    return true;
  }
  else if (message.action === 'discover') startDiscovery();
});

async function startDiscovery() {
  const creators = await Storage.getCreators();
  const topCreators = Object.values(creators)
    .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
    .slice(0, 3);

  for (const creator of topCreators) {
    chrome.tabs.create({ url: `https://www.youtube.com${creator.id}/channels`, active: false });
  }
}
