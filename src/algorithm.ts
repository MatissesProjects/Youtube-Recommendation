import { Creator, HistoryEntry } from './types';
import { CONFIG } from './constants';

export const Algorithm = {
  calculateMetrics(creator: Creator, history: HistoryEntry[], allCreators: Record<string, Creator>): { score: number, frequency: number } {
    const creatorHistory = history.filter(h => h.channelId === creator.id);
    if (creatorHistory.length === 0) return { score: 0, frequency: 0 };

    const rawFrequency = creatorHistory.length;

    // Binge-Watcher Session Cap
    const dayMap: Record<number, number> = {};
    creatorHistory.forEach(h => {
      const date = new Date(h.timestamp);
      // Create a local date key (YYYYMMDD) to keep sessions consistent with user's day
      const dayKey = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
      dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
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

    // Content Farm Penalty (Fluff Check)
    // If average true duration is less than 50% of total duration, it's likely a content farm or filler-heavy channel.
    const avgFluffRatio = recentHistory.reduce((acc, h) => {
      const ratio = h.trueDuration ? (h.trueDuration / (h.totalDuration || 1)) : 1;
      return acc + ratio;
    }, 0) / recentHistory.length;

    // Base Score
    let score = (avgCompletion * 70) + Math.min(effectiveFrequency, CONFIG.MAX_FREQUENCY_POINTS);

    // Social Boost: Check if this creator is endorsed by other high-loyalty creators
    // We pass the full creators map to the metrics function for this
    const endorsers = Object.values(allCreators).filter(other => 
      other.id !== creator.id && 
      other.loyaltyScore > 80 && 
      other.endorsements?.includes(creator.id)
    );
    if (endorsers.length > 0) {
      score += (endorsers.length * 5); // +5 per high-loyalty endorser
    }

    if (avgFluffRatio < 0.5) {
      score *= 0.5; // Heavy penalty for content farms
    } else if (avgFluffRatio < 0.7) {
      score *= 0.8; // Minor penalty for filler-heavy channels
    }

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
        const metrics = this.calculateMetrics(creator, history, updatedCreators);
        creator.loyaltyScore = metrics.score;
        creator.frequency = metrics.frequency;
      }
    }
    return updatedCreators;
  }
};
