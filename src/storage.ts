export interface Creator {
  id: string; // channelId
  name: string;
  lastUploadDate?: number;
  loyaltyScore: number;
}

export interface HistoryEntry {
  videoId: string;
  channelId: string;
  watchTime: number; // in seconds
  totalDuration: number; // in seconds
  timestamp: number;
}

export interface Suggestion {
  channelId: string;
  reason: string; // e.g., "Similar to X"
  status: 'new' | 'ignored' | 'followed';
}

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

  async getSuggestions(): Promise<Suggestion[]> {
    const data = await chrome.storage.local.get('suggestions');
    return (data.suggestions as Suggestion[]) || [];
  },

  async saveSuggestions(suggestions: Suggestion[]): Promise<void> {
    await chrome.storage.local.set({ suggestions });
  }
};
