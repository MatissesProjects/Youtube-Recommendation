import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity } from './vectorDb';
import { isBridgeCreator } from './utils';
import { GenerativeService } from './generativeService';

describe('Semantic Utilities', () => {
  it('cosineSimilarity should return 1 for identical vectors', () => {
    const v = [1, 0, 1];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it('cosineSimilarity should return 0 for orthogonal vectors', () => {
    const v1 = [1, 0];
    const v2 = [0, 1];
    expect(cosineSimilarity(v1, v2)).toBe(0);
  });

  it('isBridgeCreator should identify creators matching multiple topics', () => {
    const topics = ['coding', 'ai', 'cooking'];
    const reason = 'This creator talks about AI and coding tutorials.';
    expect(isBridgeCreator(reason, topics)).toBe(true);
  });

  it('isBridgeCreator should return false for single topic match', () => {
    const topics = ['coding', 'ai'];
    const reason = 'Just a coding channel.';
    expect(isBridgeCreator(reason, topics)).toBe(false);
  });
});

describe('GenerativeService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // @ts-ignore
    vi.stubGlobal('window', { ai: undefined });
  });

  it('should fallback to Template when no AI is available', async () => {
    const result = await GenerativeService.generateReason('NewGuy', 'FavGuy', ['tech']);
    expect(result.source).toBe('System');
    expect(result.reason).toContain('Semantic match');
  });

  it('should use Ollama if available', async () => {
    // Mock successful Ollama response
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'AI generated reason' })
    });

    const result = await GenerativeService.generateReason('NewGuy', 'FavGuy', ['tech']);
    expect(result.source).toBe('Ollama');
    expect(result.reason).toBe('AI generated reason');
  });
});
