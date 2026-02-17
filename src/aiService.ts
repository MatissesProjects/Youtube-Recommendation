export const AIService = {
  creating: null as Promise<void> | null,

  async setupOffscreen() {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    const existingContexts = await (chrome.runtime as any).getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) return;

    if (this.creating) {
      await this.creating;
    } else {
      this.creating = (chrome as any).offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['LOCAL_STORAGE'],
        justification: 'Running local AI models for semantic embeddings'
      });
      await this.creating;
      this.creating = null;
    }
  },

  async getEmbedding(text: string): Promise<number[] | null> {
    // 1. Try Offscreen (transformers.js)
    try {
      await this.setupOffscreen();
      const response = await chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'generateEmbedding',
        text
      });
      if (response?.success) return response.embedding;
    } catch (e) {
      console.log('AIService: Offscreen embedding failed, trying Ollama...');
    }

    // 2. Fallback to Ollama
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:8b', // or 'mxbai-embed-large' or whatever the user has
          prompt: text
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.embedding;
      }
    } catch (e) {
      console.log('AIService: Ollama embedding fallback failed.');
    }

    return null;
  }
};
