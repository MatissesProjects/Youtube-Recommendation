import { Storage, Creator } from './storage';

console.log('History scraper active...');

function injectImportButton() {
  if (document.getElementById('curator-import-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'curator-import-btn';
  btn.textContent = 'Import History to The Curator';
  btn.style.position = 'fixed';
  btn.style.top = '80px';
  btn.style.right = '20px';
  btn.style.zIndex = '9999';
  btn.style.padding = '10px 20px';
  btn.style.backgroundColor = '#c00';
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.borderRadius = '2px';
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = 'bold';
  btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

  btn.onclick = async () => {
    btn.textContent = 'Importing...';
    btn.disabled = true;
    await scrapeHistory();
    btn.textContent = 'Import Complete!';
    setTimeout(() => {
      btn.textContent = 'Import History to The Curator';
      btn.disabled = false;
    }, 3000);
  };

  document.body.appendChild(btn);
}

async function scrapeHistory() {
  const items = document.querySelectorAll('ytd-video-renderer');
  console.log(`Found ${items.length} videos in history.`);

  const creators = await Storage.getCreators();
  let newCount = 0;

  for (const item of items) {
    const titleElement = item.querySelector('#video-title');
    const channelElement = item.querySelector('#channel-name a');
    
    if (titleElement && channelElement) {
      const videoId = (titleElement.getAttribute('href') || '').match(/v=(.*?)($|&)/)?.[1];
      const channelId = channelElement.getAttribute('href');
      const channelName = (channelElement.textContent || '').trim();

      if (videoId && channelId && !creators[channelId]) {
        creators[channelId] = {
          id: channelId,
          name: channelName,
          loyaltyScore: 0
        };
        newCount++;
      }
    }
  }
  
  await chrome.storage.local.set({ creators });
  alert(`Imported ${newCount} new creators to your local database!`);
}

// Keep trying to inject until the page is ready
const injectionInterval = setInterval(() => {
  if (document.body) {
    injectImportButton();
    // We don't clear interval because YouTube is a SPA and the button might be removed on navigation
  }
}, 2000);
