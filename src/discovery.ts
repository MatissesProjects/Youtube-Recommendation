import { Storage, Suggestion, Creator } from './storage';

export const Discovery = {
  async fingerprintTopCreators(): Promise<string[]> {
    const creators = await Storage.getCreators();
    return Object.values(creators)
      .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
      .slice(0, 5)
      .map(c => c.id);
  },

  async scrapeChannelsTab(channelId: string) {
    // This would need to be run via a content script injection
    console.log(`Discovery: Scrapping channels for ${channelId}`);
    // We would open the channel's "Channels" tab and scrape the links
    // URL: https://www.youtube.com/${channelId}/channels
  }
};
