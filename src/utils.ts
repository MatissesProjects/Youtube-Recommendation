export function isBridgeCreator(suggestionReason: string, topTopics: string[]): boolean {
    if (!suggestionReason || topTopics.length === 0) return false;
    const reasonLower = suggestionReason.toLowerCase();
    const matches = topTopics.filter(topic => reasonLower.includes(topic.toLowerCase()));
    return matches.length >= 2;
}

export function extractKeywords(text: string, stopWords: string[]): string[] {
    const stopWordsSet = new Set(stopWords);
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !stopWordsSet.has(w));
    
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
}

export function normalizeYoutubeUrl(path: string): string {
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://www.youtube.com${cleanPath}`;
}

export function detectCollaborations(text: string): string[] {
    // Pattern to find @mentions or links to other channels in descriptions
    const mentionPattern = /@([a-zA-Z0-9._-]+)/g;
    const channelLinkPattern = /youtube\.com\/(channel\/|@|user\/)([a-zA-Z0-9._-]+)/g;
    
    const collaborations = new Set<string>();
    
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
        if (match[1]) collaborations.add(`/@${match[1]}`);
    }
    
    while ((match = channelLinkPattern.exec(text)) !== null) {
        if (match[2]) {
            const prefix = match[1] === 'channel/' ? '/channel/' : '/@';
            collaborations.add(`${prefix}${match[2]}`);
        }
    }
    
    return Array.from(collaborations);
}
