import { CONFIG } from './constants';

export const GenerativeService = {
    async generateReason(suggestionName: string, topCreatorName: string, topics: string[]): Promise<{reason: string, source: string}> {
        const prompt = `Explain in one short sentence why someone who loves the YouTube creator "${topCreatorName}" (who focuses on ${topics.join(', ')}) would also like "${suggestionName}". Keep it conversational and brief.`;

        // 1. Try Chrome Built-in AI (window.ai)
        try {
            // @ts-ignore
            if (typeof window.ai !== 'undefined' && window.ai.createTextSession) {
                // @ts-ignore
                const session = await window.ai.createTextSession();
                const result = await session.prompt(prompt);
                return { reason: result.trim(), source: 'window.ai' };
            }
        } catch (e) {
            console.log('GenerativeService: window.ai failed or not enabled.');
        }

        // 2. Try Ollama (Local LLM)
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
            console.log('GenerativeService: Ollama not found on localhost:11434');
        }

        // 3. Fallback to Template Logic
        const topicStr = topics.length > 0 ? ` (vibe: ${topics.join(', ')})` : '';
        return { 
            reason: `Semantic match with ${topCreatorName}${topicStr}.`, 
            source: 'System' 
        };
    },

    async summarizeTranscript(transcript: string): Promise<{summary: string, source: string}> {
        const prompt = `Summarize the following video transcript in a short bulleted list of 3-5 key takeaways. Be concise and objective.\n\nTranscript: ${transcript.substring(0, 5000)}`; // Truncate for local LLM limits

        // 1. Try Chrome Built-in AI
        try {
            // @ts-ignore
            if (typeof window.ai !== 'undefined' && window.ai.createTextSession) {
                // @ts-ignore
                const session = await window.ai.createTextSession();
                const result = await session.prompt(prompt);
                return { summary: result.trim(), source: 'window.ai' };
            }
        } catch (e) {
            console.log('GenerativeService: window.ai summarization failed.');
        }

        // 2. Try Ollama
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
            console.log('GenerativeService: Ollama summarization failed.');
        }

        return { 
            summary: "AI summarization unavailable. Please check window.ai or Ollama settings.", 
            source: 'System' 
        };
    },

    async summarizeCreatorInfo(creatorName: string, searchResults: string): Promise<string> {
        const prompt = `Based on these search results for the YouTube creator "${creatorName}", provide a concise 2-sentence summary of what their content is about and their main niche. Do not use buzzwords. \n\nResults: ${searchResults.substring(0, 2000)}`;

        try {
            // @ts-ignore
            if (typeof window.ai !== 'undefined' && window.ai.createTextSession) {
                // @ts-ignore
                const session = await window.ai.createTextSession();
                return await session.prompt(prompt);
            }
        } catch (e) {}

        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'qwen3:8b', prompt: prompt, stream: false })
            });
            if (response.ok) {
                const data = await response.json();
                return data.response.trim();
            }
        } catch (e) {}

        return "Search-enriched profile.";
    }
};
