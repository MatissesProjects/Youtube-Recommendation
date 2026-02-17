import { Creator, HistoryEntry, Suggestion } from './types';

export const Storage = {
  async getCreators(): Promise<Record<string, Creator>> {
    const data = await chrome.storage.local.get('creators');
    return (data.creators as Record<string, Creator>) || {};
  },

  async saveCreator(creator: Creator): Promise<void> {
    const creators = await this.getCreators();
    creators[creator.id] = creator;
    await chrome.storage.local.set({ creators });
  },

  async getHistory(): Promise<HistoryEntry[]> {
    const data = await chrome.storage.local.get('history');
    return (data.history as HistoryEntry[]) || [];
  },

  async addHistoryEntry(entry: HistoryEntry): Promise<void> {
    const history = await this.getHistory();
    history.push(entry);
    await chrome.storage.local.set({ history });
  },

  async bulkAddHistory(entries: HistoryEntry[]): Promise<void> {
    const history = await this.getHistory();
    const existingIds = new Set(history.map(h => h.videoId + h.timestamp));
    const uniqueNew = entries.filter(e => !existingIds.has(e.videoId + e.timestamp));
    await chrome.storage.local.set({ history: [...history, ...uniqueNew] });
  },

  async getSuggestions(): Promise<Suggestion[]> {
    const data = await chrome.storage.local.get('suggestions');
    return (data.suggestions as Suggestion[]) || [];
  },

  async saveSuggestions(suggestions: Suggestion[]): Promise<void> {
    await chrome.storage.local.set({ suggestions });
  },

  async updateSuggestionStatus(channelId: string, status: Suggestion['status']): Promise<void> {
    const suggestions = await this.getSuggestions();
    const index = suggestions.findIndex(s => s.channelId === channelId);
    if (index !== -1 && suggestions[index]) {
      suggestions[index].status = status;
      await this.saveSuggestions(suggestions);
    }
  },

  async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
  }
};
