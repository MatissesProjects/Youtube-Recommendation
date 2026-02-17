import { Storage } from './storage';
import { GenerativeService } from './generativeService';
import { extractKeywords } from './utils';
import { CONFIG } from './constants';

export const EnrichmentService = {
    async enrichCreator(channelId: string, searchResults: string): Promise<void> {
        const creators = await Storage.getCreators();
        const creator = creators[channelId];
        if (!creator) return;

        const summary = await GenerativeService.summarizeCreatorInfo(creator.name, searchResults);

        if (summary) {
            creator.enrichedDescription = summary;
            
            // Also extract new keywords from the enriched description
            const extraKeywords = extractKeywords(summary, CONFIG.STOP_WORDS);
            if (!creator.keywords) creator.keywords = {};
            extraKeywords.forEach(k => {
                // Weight search-derived keywords more heavily to drive clustering
                creator.keywords![k] = (creator.keywords![k] || 0) + 5;
            });

            await Storage.saveCreator(creator);
        }
    }
};
