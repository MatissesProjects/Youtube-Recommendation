import { Storage, Creator } from './storage';
import { extractKeywords } from './utils';
import { CONFIG } from './constants';

console.log('The Curator: History scraper loaded.');

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
    try {
      await scrapeHistory();
    } catch (e) {
      console.error('The Curator: Scrape failed', e);
      alert('Error during import. Check console for details.');
    }
    btn.textContent = 'Import History to The Curator';
    btn.disabled = false;
  };

  document.body.appendChild(btn);
}

async function scrapeHistory() {
  // Target both old (ytd-video-renderer) and new (yt-lockup-view-model) YouTube components
  const items = document.querySelectorAll('ytd-video-renderer, yt-lockup-view-model');
  
  console.log(`The Curator: Processing ${items.length} items.`);

  if (items.length === 0) {
    alert("No videos found. YouTube's layout might have changed. Try scrolling down.");
    return;
  }

  const creators = await Storage.getCreators();
  const suggestions = await Storage.getSuggestions();
  const historyEntries: any[] = [];
  let newCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of Array.from(items)) {
    // ... link extraction logic ...
    const links = Array.from(item.querySelectorAll('a'));
    const videoLink = links.find(a => a.getAttribute('href')?.includes('watch?v='));
    const videoId = videoLink ? (videoLink.getAttribute('href') || '').match(/v=(.*?)($|&)/)?.[1] : null;

    let channelLink = links.find(a => {
        const href = a.getAttribute('href') || '';
        return (href.includes('/@') || href.includes('/channel/') || href.includes('/user/')) && !href.includes('watch?v=');
    });

    let channelName = '';
    let channelId = '';

    if (channelLink) {
        channelId = channelLink.getAttribute('href') || '';
        channelName = (channelLink.textContent || '').trim();
    } else {
        const metadataRows = item.querySelectorAll('.yt-content-metadata-view-model__metadata-row, yt-content-metadata-view-model');
        for (const row of Array.from(metadataRows)) {
            const firstSpan = row.querySelector('span');
            if (firstSpan && firstSpan.textContent && !firstSpan.textContent.includes('views') && !firstSpan.textContent.includes('ago')) {
                channelName = firstSpan.textContent.trim();
                channelId = '/@' + channelName.replace(/\s+/g, '');
                break;
            }
        }
    }

    if (videoId && channelId && channelName) {
      const videoTitle = videoLink?.getAttribute('title') || videoLink?.textContent?.trim() || 'Imported Video';
      const descriptionSnippet = (item.querySelector('#description-text')?.textContent || '').trim();
      const tags = extractKeywords(`${videoTitle} ${descriptionSnippet}`, CONFIG.STOP_WORDS);

      if (!creators[channelId]) {
        creators[channelId] = {
          id: channelId,
          name: channelName,
          loyaltyScore: 0,
          frequency: 0,
          keywords: {}
        };
        newCount++;
        
        // Remove from suggestions if it was there
        const suggIndex = suggestions.findIndex(s => s.channelId === channelId);
        if (suggIndex !== -1) suggestions.splice(suggIndex, 1);
      } else {
        skippedCount++;
      }

      // Update creator's keyword profile with historical data
      const creator = creators[channelId];
      if (creator) {
        if (!creator.keywords) creator.keywords = {};
        tags.forEach(t => {
            creator.keywords![t] = (creator.keywords![t] || 0) + 1;
        });
      }

      // Track 2: Seed History
      historyEntries.push({
        videoId,
        channelId,
        title: videoTitle,
        watchTime: 600, // Assume 10 mins (seeded value)
        totalDuration: 600, // Assume 100% completion for seeded history
        timestamp: Date.now() - (historyEntries.length * 1000), // Spread them out slightly
        tags: tags
      });

      (item as HTMLElement).style.outline = '2px solid green';
    } else {
      errorCount++;
      (item as HTMLElement).style.outline = '2px solid orange';
    }
  }
  
  await chrome.storage.local.set({ creators });
  await Storage.saveSuggestions(suggestions);
  await Storage.bulkAddHistory(historyEntries);
  alert(`Import Finished!\n- Videos Processed: ${items.length}\n- New Creators: ${newCount}\n- History Entries Seeded: ${historyEntries.length}`);
}

setTimeout(injectImportButton, 2000);

let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(injectImportButton, 2000);
  }
}, 2000);
