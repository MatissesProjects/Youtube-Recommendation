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
  EMBEDDING_SYNC_COUNT: 20
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
