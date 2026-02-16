import { Storage, HistoryEntry, Creator } from './storage';

console.log('History scraper active...');

async function scrapeHistory() {
  const items = document.querySelectorAll('ytd-video-renderer');
  console.log(`Found ${items.length} videos in history.`);

  for (const item of items) {
    const titleElement = item.querySelector('#video-title');
    const channelElement = item.querySelector('#channel-name a');
    
    if (titleElement && channelElement) {
      const videoId = (titleElement.getAttribute('href') || '').match(/v=(.*?)($|&)/)?.[1];
      const channelId = channelElement.getAttribute('href');
      const channelName = (channelElement.textContent || '').trim();

      if (videoId && channelId) {
        // Since we don't know watch time from history page, we'll mark it as "imported" 
        // or assume some default completion if we want to seed loyalty.
        // For now, let's just seed the creators.
        
        const creators = await Storage.getCreators();
        if (!creators[channelId]) {
          const creator: Creator = {
            id: channelId,
            name: channelName,
            loyaltyScore: 0
          };
          await Storage.saveCreator(creator);
        }
      }
    }
  }
  console.log('History seeding complete.');
}

// Wait for items to load
setTimeout(scrapeHistory, 3000);
