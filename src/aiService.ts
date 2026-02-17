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
    await this.setupOffscreen();
    const response = await chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'generateEmbedding',
      text
    });
    return response?.success ? response.embedding : null;
  }
};
