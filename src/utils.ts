export function isBridgeCreator(suggestionReason: string, topTopics: string[]): boolean {
    if (!suggestionReason || topTopics.length === 0) return false;
    const reasonLower = suggestionReason.toLowerCase();
    const matches = topTopics.filter(topic => reasonLower.includes(topic.toLowerCase()));
    return matches.length >= 2;
}
