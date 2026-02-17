import { EmbeddingEntry } from './types';

export const VectorDB = {
    DB_NAME: 'CuratorVectorDB',
    STORE_NAME: 'embeddings',
    VERSION: 1,

    async getDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    },

    async saveEmbedding(id: string, embedding: number[]): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const entry: EmbeddingEntry = { id, embedding, timestamp: Date.now() };
            const request = store.put(entry);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    async getEmbedding(id: string): Promise<number[] | null> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result?.embedding || null);
        });
    },

    async getAllEmbeddings(): Promise<EmbeddingEntry[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
};

export function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += (a[i] || 0) * (b[i] || 0);
        normA += (a[i] || 0) * (a[i] || 0);
        normB += (b[i] || 0) * (b[i] || 0);
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}
