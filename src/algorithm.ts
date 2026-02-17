import { Creator, HistoryEntry } from './storage';

export const Algorithm = {
  calculateMetrics(creator: Creator, history: HistoryEntry[]): { score: number, frequency: number } {
    const creatorHistory = history.filter(h => h.channelId === creator.id);
    if (creatorHistory.length === 0) return { score: 0, frequency: 0 };

    // Frequency: How many total videos watched?
    const rawFrequency = creatorHistory.length;

    // Binge-Watcher Session Cap: Max 3 frequency points per day
    const dayMap: Record<number, number> = {};
    creatorHistory.forEach(h => {
      const day = Math.floor(h.timestamp / (1000 * 60 * 60 * 24));
      dayMap[day] = (dayMap[day] || 0) + 1;
    });

    let effectiveFrequency = 0;
    Object.values(dayMap).forEach(count => {
      effectiveFrequency += Math.min(count, 3); // Cap each day at 3 points
    });

    // Recency: Days since last watch
    const lastWatch = Math.max(...creatorHistory.map(h => h.timestamp));
    const daysSinceLastWatch = (Date.now() - lastWatch) / (1000 * 60 * 60 * 24);

    // Loyalty Ratio (Simplified for now: Average completion of last 10 videos)
    const recentHistory = creatorHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    const avgCompletion = recentHistory.reduce((acc, h) => acc + (h.watchTime / (h.totalDuration || 1)), 0) / recentHistory.length;

    // Base Score (0-100)
    let score = avgCompletion * 70; // Up to 70 points from completion
    score += Math.min(effectiveFrequency, 30); // Up to 30 points from effective frequency (capped at 30 days of unique engagement)

    // Decay Engine (5-Month Rule)
    const fiveMonthsInDays = 5 * 30;
    if (daysSinceLastWatch > fiveMonthsInDays) {
      const lastUpload = creator.lastUploadDate || 0;
      // IF (LastUploadDate < LastWatchDate): exemption (Creator is on hiatus)
      if (lastUpload > lastWatch) {
        // ELSE: Apply 0.2x weight penalty (User lost interest)
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
