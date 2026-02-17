import { CONFIG } from './constants';

export const GenerativeService = {
    async generateReason(suggestionName: string, topCreatorName: string, topics: string[]): Promise<string> {
        const prompt = `Explain in one short sentence why someone who loves the YouTube creator "${topCreatorName}" (who focuses on ${topics.join(', ')}) would also like "${suggestionName}". Keep it conversational and brief.`;

        // 1. Try Chrome Built-in AI (window.ai)
        try {
            // @ts-ignore - window.ai is experimental
            if (typeof window.ai !== 'undefined' && window.ai.createTextSession) {
                // @ts-ignore
                const session = await window.ai.createTextSession();
                const result = await session.prompt(prompt);
                return result.trim();
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
                    model: 'qwen3:8b', // or mistral, etc.
                    prompt: prompt,
                    stream: false,
                    options: { num_predict: 50 }
                })
            });
            if (response.ok) {
                const data = await response.json();
                return data.response.trim();
            }
        } catch (e) {
            console.log('GenerativeService: Ollama not found on localhost:11434');
        }

        // 3. Fallback to Template Logic
        const topicStr = topics.length > 0 ? ` (vibe: ${topics.join(', ')})` : '';
        return `Semantic match with ${topCreatorName}${topicStr}.`;
    }
};
