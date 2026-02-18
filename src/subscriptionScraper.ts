import { Storage } from './storage';

(function() {
  if (!window.location.hostname.includes('youtube.com')) {
    return;
  }

  console.log('The Curator: Subscription scraper active.');

  async function scrapeSubscriptions() {
      const items = document.querySelectorAll('ytd-grid-channel-renderer, ytd-channel-renderer');
      console.log(`The Curator: Found ${items.length} subscriptions on page.`);

      if (items.length === 0) return;

      const creators = await Storage.getCreators();
      let newCount = 0;

      for (const item of Array.from(items)) {
          const link = item.querySelector('a#main-link, a.ytd-grid-channel-renderer');
          const nameEl = item.querySelector('#channel-title, #title');
          
          const channelId = link?.getAttribute('href');
          const channelName = nameEl?.textContent?.trim();

          if (channelId && channelName) {
              if (!creators[channelId]) {
                  creators[channelId] = {
                      id: channelId,
                      name: channelName,
                      loyaltyScore: 20, // Baseline for being subscribed
                      frequency: 0,
                      keywords: {}
                  };
                  newCount++;
              }
          }
      }

      if (newCount > 0) {
          await chrome.storage.local.set({ creators });
          console.log(`The Curator: Imported ${newCount} new creators from subscriptions.`);
          
          // Notify user via the same notification system we added to historyScraper
          const notif = document.createElement('div');
          notif.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#1a73e8; color:white; padding:15px; border-radius:8px; z-index:10000;';
          notif.textContent = `Imported ${newCount} subscriptions into your Galaxy!`;
          document.body.appendChild(notif);
          setTimeout(() => notif.remove(), 5000);
      }
  }

  // Inject button like we did for history
  function injectSubBtn() {
      if (document.getElementById('curator-sub-import')) return;
      const header = document.querySelector('ytd-section-list-renderer');
      if (!header) return;

      const btn = document.createElement('button');
      btn.id = 'curator-sub-import';
      btn.textContent = 'Sync Subscriptions to Galaxy';
      btn.style.cssText = 'margin: 20px; padding: 10px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';
      
      btn.onclick = scrapeSubscriptions;
      header.parentNode?.insertBefore(btn, header);
  }

  setTimeout(injectSubBtn, 2000);
})();
