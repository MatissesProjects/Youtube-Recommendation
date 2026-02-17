import { Creator, HistoryEntry } from './types';
import { CONFIG } from './constants';

export const Algorithm = {
  calculateMetrics(creator: Creator, history: HistoryEntry[]): { score: number, frequency: number } {
    const creatorHistory = history.filter(h => h.channelId === creator.id);
    if (creatorHistory.length === 0) return { score: 0, frequency: 0 };

    const rawFrequency = creatorHistory.length;

    // Binge-Watcher Session Cap
    const dayMap: Record<number, number> = {};
    creatorHistory.forEach(h => {
      const day = Math.floor(h.timestamp / (1000 * 60 * 60 * 24));
      dayMap[day] = (dayMap[day] || 0) + 1;
    });

    let effectiveFrequency = 0;
    Object.values(dayMap).forEach(count => {
      effectiveFrequency += Math.min(count, CONFIG.DAILY_SESSION_CAP);
    });

    // Recency
    const lastWatch = Math.max(...creatorHistory.map(h => h.timestamp));
    const daysSinceLastWatch = (Date.now() - lastWatch) / (1000 * 60 * 60 * 24);

    // Loyalty Ratio (Average completion of last 10)
    const recentHistory = creatorHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    const avgCompletion = recentHistory.reduce((acc, h) => acc + (h.watchTime / (h.totalDuration || 1)), 0) / recentHistory.length;

    // Base Score
    let score = (avgCompletion * 70) + Math.min(effectiveFrequency, CONFIG.MAX_FREQUENCY_POINTS);

    // Decay Engine
    const decayThreshold = CONFIG.DECAY_MONTHS * 30;
    if (daysSinceLastWatch > decayThreshold) {
      const lastUpload = creator.lastUploadDate || 0;
      if (lastUpload > lastWatch) {
        score *= 0.2;
      }
    }

    return {
      score: Math.round(Math.min(score, 100)),
      frequency: rawFrequency
    };
  },

  async updateAllScores(creators: Record<string, Creator>, history: HistoryEntry[]): Promise<Record<string, Creator>> {
    const updatedCreators = { ...creators };
    for (const id in updatedCreators) {
      const creator = updatedCreators[id];
      if (creator) {
        const metrics = this.calculateMetrics(creator, history);
        creator.loyaltyScore = metrics.score;
        creator.frequency = metrics.frequency;
      }
    }
    return updatedCreators;
  }
};
