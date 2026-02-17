import { CONFIG } from './constants';

export const GenerativeService = {
    async generateReason(suggestionName: string, topCreatorName: string, topics: string[]): Promise<{reason: string, source: string}> {
        const prompt = `Explain in one short sentence why someone who loves the YouTube creator "${topCreatorName}" (who focuses on ${topics.join(', ')}) would also like "${suggestionName}". Keep it conversational and brief.`;

        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen3:8b', 
                    prompt: prompt,
                    stream: false,
                    options: { num_predict: 50 }
                })
            });
            if (response.ok) {
                const data = await response.json();
                return { reason: data.response.trim(), source: 'Ollama' };
            }
        } catch (e) {
            console.log('GenerativeService: Ollama failed.');
        }

        const topicStr = topics.length > 0 ? ` (vibe: ${topics.join(', ')})` : '';
        return { 
            reason: `Semantic match with ${topCreatorName}${topicStr}.`, 
            source: 'System' 
        };
    },

    async summarizeTranscript(transcript: string): Promise<{summary: string, source: string}> {
        const prompt = `Summarize the following video transcript in a short bulleted list of 3-5 key takeaways. Be concise and objective.\n\nTranscript: ${transcript.substring(0, 5000)}`;

        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen3:8b',
                    prompt: prompt,
                    stream: false
                })
            });
            if (response.ok) {
                const data = await response.json();
                return { summary: data.response.trim(), source: 'Ollama' };
            }
        } catch (e) {
            console.log('GenerativeService: Ollama failed.');
        }

        return { 
            summary: "Local AI (Ollama) unavailable. Please ensure it is running.", 
            source: 'System' 
        };
    },

    async summarizeCreatorInfo(creatorName: string, searchResults: string): Promise<string> {
        const prompt = `Based on these search results for the YouTube creator "${creatorName}", generate a structured "Vibe Report" in the following format:
        
        1. **The Hook**: One catchy sentence describing their unique appeal.
        2. **Core Topics**: Three comma-separated main topics they cover.
        3. **The Vibe**: Are they chaotic, educational, relaxing, or intense?
        
        Do not use buzzwords. Be specific and insightful.
        
        Results: ${searchResults.substring(0, 3000)}`;

        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama3', prompt: prompt, stream: false })
            });
            if (response.ok) {
                const data = await response.json();
                return data.response.trim();
            }
        } catch (e) {}

        return "Search-enriched profile (Ollama offline).";
    }
};
