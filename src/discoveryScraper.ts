import { Storage, Suggestion } from './storage';

console.log('Discovery scraper active...');

async function scrapeFeaturedChannels() {
  const channelLinks = document.querySelectorAll('ytd-grid-channel-renderer a#channel-info');
  console.log(`Found ${channelLinks.length} featured channels.`);

  const suggestions: Suggestion[] = await Storage.getSuggestions();
  const creators = await Storage.getCreators();
  
  for (const link of channelLinks) {
    const channelId = link.getAttribute('href');
    const channelName = (link.querySelector('#channel-title')?.textContent || '').trim();

    const isKnown = !!creators[channelId || ''];
    const isAlreadySuggested = !!suggestions.find(s => s.channelId === channelId);

    if (channelId && !isKnown && !isAlreadySuggested) {
      suggestions.push({
        channelId: channelId,
        reason: `Endorsed by current channel`,
        status: 'new'
      });
    }
  }

  await Storage.saveSuggestions(suggestions);
  console.log('Discovery complete.');
}

setTimeout(scrapeFeaturedChannels, 3000);
