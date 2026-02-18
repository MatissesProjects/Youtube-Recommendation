export const CONFIG = {
  COMPLETION_THRESHOLD: 0.8,
  MIN_WATCH_TIME_SECONDS: 600, // 10 minutes
  DECAY_MONTHS: 5,
  MAX_FREQUENCY_POINTS: 30,
  DAILY_SESSION_CAP: 3,
  MIN_FREQUENCY_FOR_POPUP: 2,
  SEMANTIC_MATCH_THRESHOLD: 0.4,
  TOP_CREATORS_COUNT: 10,
  RSS_POLL_INTERVAL_MINS: 24 * 60,
  SCORE_UPDATE_INTERVAL_MINS: 4 * 60,
  EMBEDDING_SYNC_COUNT: 100, // Sync more creators for better semantic clustering
  DEFAULT_LLM_MODEL: 'qwen3:8b', // Standardize model
  DEFAULT_EMBEDDING_MODEL: 'nomic-embed-text', // Good default for embeddings
  RABBIT_HOLE: {
    BOOST_FACTOR: 10,
    DURATION_MINUTES: 30
  },
  STOP_WORDS: [
    'google', 'youtube', 'http', 'https', 'www', 'video', 'channel', 
    'subscribe', 'social', 'media', 'twitter', 'instagram', 'facebook',
    'the', 'a', 'an', 'in', 'on', 'of', 'for', 'to', 'and', 'with', 'from',
    'this', 'that', 'your', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'ollama', 'offline', 'profile', 'enriched', 'search', 'curator', 'video', 'youtube',
    'about', 'after', 'all', 'also', 'any', 'back', 'because', 'but', 'can', 'come', 'could', 'day', 'do', 'even', 'first', 'get', 'give', 'go', 'good', 'have', 'he', 'her', 'him', 'his', 'how', 'into', 'it', 'its', 'just', 'know', 'like', 'look', 'make', 'me', 'most', 'my', 'new', 'no', 'not', 'now', 'only', 'or', 'other', 'our', 'out', 'over', 'people', 'say', 'see', 'she', 'some', 'take', 'tell', 'than', 'their', 'them', 'then', 'there', 'these', 'they', 'think', 'time', 'up', 'use', 'very', 'want', 'way', 'we', 'well', 'what', 'when', 'which', 'who', 'will', 'year', 'you', 'your'
  ]
};

export const SELECTORS = {
  VIDEO_PLAYER: 'video',
  CHANNEL_LINK_WATCH: [
    'ytd-video-owner-renderer a.yt-simple-endpoint',
    '#owner #channel-name a',
    'ytd-video-secondary-info-renderer #channel-name a'
  ],
  SIDEBAR_ITEMS: 'ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model',
  HISTORY_ITEMS: 'ytd-video-renderer, yt-lockup-view-model'
};
