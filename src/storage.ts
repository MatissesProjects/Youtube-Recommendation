export interface Creator {
  id: string; // channelId
  name: string;
  lastUploadDate?: number;
  latestVideo?: {
    title: string;
    id: string;
    published: number;
  };
  loyaltyScore: number;
  frequency: number;
  keywords?: Record<string, number>;
}

export interface InterestProfile {
  topKeywords: Record<string, number>;
  totalWatches: number;
}

export interface HistoryEntry {
  videoId: string;
  channelId: string;
  title?: string;
  watchTime: number; // in seconds
  totalDuration: number; // in seconds
  timestamp: number;
  tags?: string[];
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

  async bulkAddHistory(entries: HistoryEntry[]): Promise<void> {
    const history = await this.getHistory();
    // Use a Set to avoid duplicates if importing multiple times
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
