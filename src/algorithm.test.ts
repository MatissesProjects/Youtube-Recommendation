import { describe, it, expect } from 'vitest';
import { Algorithm } from './algorithm';
import { Creator, HistoryEntry } from './storage';

describe('Algorithm.calculateMetrics', () => {
  const mockCreator: Creator = {
    id: '/@test',
    name: 'Test Creator',
    loyaltyScore: 0,
    frequency: 0
  };

  it('should apply the session cap (max 3 per day)', () => {
    const today = Date.now();
    const history: HistoryEntry[] = [];
    
    // Watch 10 videos today
    for (let i = 0; i < 10; i++) {
      history.push({
        videoId: `v${i}`,
        channelId: '/@test',
        watchTime: 100,
        totalDuration: 100,
        timestamp: today
      });
    }

    const metrics = Algorithm.calculateMetrics(mockCreator, history);
    
    // Raw frequency should be 10
    expect(metrics.frequency).toBe(10);
    
    // Score should be based on effective frequency of 3
    // Completion (100%) = 70 points
    // Effective Freq (3) = 3 points
    // Total = 73
    expect(metrics.score).toBe(73);
  });

  it('should reward consistent watching across multiple days', () => {
    const history: HistoryEntry[] = [];
    const oneDay = 1000 * 60 * 60 * 24;
    
    // Watch 1 video per day for 5 days
    for (let i = 0; i < 5; i++) {
      history.push({
        videoId: `v${i}`,
        channelId: '/@test',
        watchTime: 100,
        totalDuration: 100,
        timestamp: Date.now() - (i * oneDay)
      });
    }

    const metrics = Algorithm.calculateMetrics(mockCreator, history);
    
    // Raw frequency = 5, Effective frequency = 5
    // Completion = 70
    // Freq = 5
    expect(metrics.score).toBe(75);
  });

  it('should apply decay penalty for inactivity', () => {
    const fiveMonthsAgo = Date.now() - (5 * 31 * 24 * 60 * 60 * 1000);
    const history: HistoryEntry[] = [{
      videoId: 'old',
      channelId: '/@test',
      watchTime: 100,
      totalDuration: 100,
      timestamp: fiveMonthsAgo - 1000
    }];

    const creatorWithRecentUpload: Creator = {
      ...mockCreator,
      lastUploadDate: Date.now() // Creator uploaded recently, but user didn't watch
    };

    const metrics = Algorithm.calculateMetrics(creatorWithRecentUpload, history);
    
    // Base score would be ~71 (100% completion + 1 freq)
    // Penalty 0.2x should bring it down significantly
    expect(metrics.score).toBeLessThan(20);
  });

  it('should apply content farm penalty for low true duration ratio', () => {
    const today = Date.now();
    const history: HistoryEntry[] = [];
    
    // Watch 10 videos, but with 60% fluff (True Duration = 40% of Total)
    for (let i = 0; i < 10; i++) {
      history.push({
        videoId: `v${i}`,
        channelId: '/@test',
        watchTime: 100,
        totalDuration: 100,
        trueDuration: 40, // 40/100 = 0.4 (< 0.5 threshold)
        timestamp: today
      });
    }

    const metrics = Algorithm.calculateMetrics(mockCreator, history);
    
    // Base score would be 73 (70 for completion + 3 capped freq)
    // 0.5x penalty should be ~37
    expect(metrics.score).toBe(37);
  });

  it('should apply minor penalty for moderate fluff (50-70% true duration)', () => {
    const today = Date.now();
    const history: HistoryEntry[] = [];
    
    // Watch 10 videos with 40% fluff (True Duration = 60% of Total)
    for (let i = 0; i < 10; i++) {
      history.push({
        videoId: `v${i}`,
        channelId: '/@test',
        watchTime: 100,
        totalDuration: 100,
        trueDuration: 60, // 60/100 = 0.6 (between 0.5 and 0.7)
        timestamp: today
      });
    }

    const metrics = Algorithm.calculateMetrics(mockCreator, history);
    
    // Base score would be 73
    // 0.8x penalty should be ~58
    expect(metrics.score).toBe(58);
  });
});
