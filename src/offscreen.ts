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
        // Reduced logging to avoid noise
        try {
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        } catch (err: any) {
            // Log once as a warning, then stay quiet. AIService will handle the fallback.
            console.warn('Offscreen: WASM model load failed (likely CSP). Using fallback.');
            embedder = null;
            throw err;
        }
    }
    return embedder;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.action === 'generateEmbedding') {
        getEmbedder().then(async (pipe) => {
            const output = await pipe(message.text, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data);
            sendResponse({ success: true, embedding });
        }).catch(error => {
            console.error('Offscreen Runtime Error:', error);
            sendResponse({ success: false, error: error.message || 'Model load failure' });
        });
    }
    return true; // Keep channel open
});
