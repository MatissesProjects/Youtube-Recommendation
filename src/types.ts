export interface Creator {
  id: string; // channelId (href or canonical ID)
  handle?: string; // @handle
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
  endorsements?: string[]; // IDs of channels this creator featured
  enrichedDescription?: string; // Information gathered from web search
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
  category?: string;
  liked?: boolean;
  commented?: boolean;
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
