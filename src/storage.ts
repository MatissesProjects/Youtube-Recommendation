export interface RabbitHoleState {
  topic: string;
  expiresAt: number;
}

export interface AppSettings {
  focusMode: boolean;
  deHype: boolean;
  isBotThrottledUntil: number; // timestamp in ms
}

const DEFAULT_SETTINGS: AppSettings = {
  focusMode: false,
  deHype: false,
  isBotThrottledUntil: 0
};

export const Storage = {
  async getSettings(): Promise<AppSettings> {
    const data = await chrome.storage.local.get('settings');
    return (data.settings as AppSettings) || DEFAULT_SETTINGS;
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await chrome.storage.local.set({ settings });
  },

  async getRabbitHole(): Promise<RabbitHoleState | null> {
    const data = await chrome.storage.local.get('rabbitHole');
    const state = data.rabbitHole as RabbitHoleState;
    if (state && state.expiresAt > Date.now()) {
      return state;
    }
    return null;
  },

  async setRabbitHole(topic: string, durationMinutes: number): Promise<void> {
    const state: RabbitHoleState = {
      topic,
      expiresAt: Date.now() + (durationMinutes * 60 * 1000)
    };
    await chrome.storage.local.set({ rabbitHole: state });
  },

  async clearRabbitHole(): Promise<void> {
    await chrome.storage.local.remove('rabbitHole');
  },

  async getCreators(): Promise<Record<string, Creator>> {
    const data = await chrome.storage.local.get('creators');
    return (data.creators as Record<string, Creator>) || {};
  },

  async saveCreator(creator: Creator): Promise<void> {
    const data = await chrome.storage.local.get('creators');
    const creators = (data.creators as Record<string, Creator>) || {};
    creators[creator.id] = creator;
    await chrome.storage.local.set({ creators });
  },

  async getHistory(): Promise<HistoryEntry[]> {
    const data = await chrome.storage.local.get('history');
    return (data.history as HistoryEntry[]) || [];
  },

  async addHistoryEntry(entry: HistoryEntry): Promise<void> {
    const data = await chrome.storage.local.get('history');
    const history = (data.history as HistoryEntry[]) || [];
    history.push(entry);
    await chrome.storage.local.set({ history });
  },

  async bulkAddHistory(entries: HistoryEntry[]): Promise<void> {
    const data = await chrome.storage.local.get('history');
    const history = (data.history as HistoryEntry[]) || [];
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
  },

  async addAnnotation(videoId: string, annotation: { timestamp: number, note: string }): Promise<void> {
    const data = await chrome.storage.local.get('history');
    const history = (data.history as HistoryEntry[]) || [];
    const entry = history.find(h => h.videoId === videoId);
    if (entry) {
      if (!entry.annotations) entry.annotations = [];
      entry.annotations.push(annotation);
      await chrome.storage.local.set({ history });
    }
  },

  async updateVideoMetadata(videoId: string, metadata: { summary?: string, transcript?: string }): Promise<void> {
    const data = await chrome.storage.local.get('history');
    const history = (data.history as HistoryEntry[]) || [];
    const entry = history.find(h => h.videoId === videoId);
    if (entry) {
      if (metadata.summary) entry.summary = metadata.summary;
      if (metadata.transcript) entry.transcript = metadata.transcript;
      await chrome.storage.local.set({ history });
    }
  },

  async exportAllData(): Promise<any> {
    return await chrome.storage.local.get(null);
  },

  async cleanupKeywords(badWords: string[]): Promise<void> {
    const creators = await this.getCreators();
    const badWordsSet = new Set(badWords.map(w => w.toLowerCase()));
    let changed = false;

    for (const id in creators) {
      const creator = creators[id];
      if (creator && creator.keywords) {
        const originalKeys = Object.keys(creator.keywords);
        for (const word of originalKeys) {
          if (badWordsSet.has(word.toLowerCase()) || word.length < 4) {
            delete creator.keywords[word];
            changed = true;
          }
        }
      }
    }

    if (changed) {
      await chrome.storage.local.set({ creators });
    }
  }
};
