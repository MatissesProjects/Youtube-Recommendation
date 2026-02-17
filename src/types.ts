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

export interface HistoryEntry {
  videoId: string;
  channelId: string;
  title?: string;
  watchTime: number; 
  totalDuration: number;
  timestamp: number;
  tags?: string[];
}

export interface Suggestion {
  channelId: string;
  reason: string;
  status: 'new' | 'ignored' | 'followed';
}

export interface EmbeddingEntry {
  id: string;
  embedding: number[];
  timestamp: number;
}
