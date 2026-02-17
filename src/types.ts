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

export interface Annotation {
  timestamp: number;
  note: string;
}

export interface SponsorSegment {
  category: string;
  start: number;
  end: number;
}

export interface HistoryEntry {
  videoId: string;
  channelId: string;
  title?: string;
  watchTime: number; 
  totalDuration: number;
  timestamp: number;
  tags?: string[];
  annotations?: Annotation[];
  summary?: string;
  transcript?: string;
  segments?: SponsorSegment[];
  trueDuration?: number; // Total length minus fluff
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
