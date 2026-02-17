export const AIService = {
  async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3', 
          prompt: text
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.embedding;
      }
    } catch (e) {
      console.error('AIService: Ollama embedding failed. Ensure Ollama is running on localhost:11434');
    }
    return null;
  }
};
