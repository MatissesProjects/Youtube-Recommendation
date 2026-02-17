import { Storage, Suggestion } from './storage';

console.log('Discovery scraper active...');

async function scrapeFeaturedChannels() {
  const channelLinks = document.querySelectorAll('ytd-grid-channel-renderer a#channel-info');
  console.log(`Found ${channelLinks.length} featured channels.`);

  // Identify source channel from URL
  const pathParts = window.location.pathname.split('/');
  const sourceChannelId = pathParts.slice(0, 2).join('/'); // e.g., /@SourceUser

  const suggestions: Suggestion[] = await Storage.getSuggestions();
  const creators = await Storage.getCreators();
  
  const endorsements: string[] = [];

  for (const link of channelLinks) {
    const channelId = link.getAttribute('href');
    if (!channelId) continue;

    endorsements.push(channelId);

    const isKnown = !!creators[channelId];
    const isAlreadySuggested = !!suggestions.find(s => s.channelId === channelId);

    if (!isKnown && !isAlreadySuggested) {
      suggestions.push({
        channelId: channelId,
        reason: `Endorsed by ${sourceChannelId}`,
        status: 'new'
      });
    }
  }

  // Update source creator with endorsements
  if (creators[sourceChannelId]) {
    creators[sourceChannelId].endorsements = [...new Set([...(creators[sourceChannelId].endorsements || []), ...endorsements])];
    await chrome.storage.local.set({ creators });
  }

  await Storage.saveSuggestions(suggestions);
  console.log('Discovery complete.');
}

setTimeout(scrapeFeaturedChannels, 3000);
