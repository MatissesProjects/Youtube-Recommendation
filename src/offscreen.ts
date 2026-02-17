import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js
env.allowLocalModels = false; // We'll download from HuggingFace
env.useBrowserCache = true;

let embedder: any = null;

async function getEmbedder() {
    if (!embedder) {
        console.log('Offscreen: Loading embedding model...');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('Offscreen: Model loaded.');
    }
    return embedder;
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.action === 'generateEmbedding') {
        try {
            const pipe = await getEmbedder();
            const output = await pipe(message.text, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data);
            sendResponse({ success: true, embedding });
        } catch (error: any) {
            console.error('Offscreen Error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep channel open
});
