import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for Chrome Extension environment
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

// Fix for "no available backend found" in some Chrome environments
// We disable the WASM proxy and can optionally point to a CDN for WASM files
if (env.backends && env.backends.onnx) {
    env.backends.onnx.wasm.proxy = false;
    // Pointing to CDN for WASM files if they are not bundled correctly
    env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
}

let embedder: any = null;

async function getEmbedder() {
    if (!embedder) {
        console.log('Offscreen: Loading embedding model (Xenova/all-MiniLM-L6-v2)...');
        try {
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log('Offscreen: Model loaded successfully.');
        } catch (err) {
            console.error('Offscreen: Failed to load model:', err);
            throw err;
        }
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
