import ForceGraph from 'force-graph';
import { Storage } from './storage';
import { Creator, HistoryEntry } from './types';
import { VectorDB, cosineSimilarity } from './vectorDb';
import { AIService } from './aiService';

async function initGalaxy() {
    const creatorsMap = await Storage.getCreators();
    const history = await Storage.getHistory();
    const allEmbeddings = await VectorDB.getAllEmbeddings();
    const creators = Object.values(creatorsMap).filter(c => c.frequency >= 1);
    
    // Create a lookup for embeddings
    const embeddingMap = new Map(allEmbeddings.map(e => [e.id, e.embedding]));

    const nodes: any[] = creators.map(c => ({
        id: c.id,
        name: c.name,
        val: Math.max(3, (c.loyaltyScore / 10)), // Slightly larger base size
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        keywords: Object.keys(c.keywords || {}),
        isSearchMatch: false
    }));

    const links: { source: string, target: string, value: number, type: 'keyword' | 'semantic' }[] = [];

    // 1. Keyword-based links (Strength 1)
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const shared = nodes[i].keywords.filter((k: string) => nodes[j].keywords.includes(k));
            if (shared.length >= 1) { // Lowered to 1 for more connectivity
                links.push({
                    source: nodes[i].id,
                    target: nodes[j].id,
                    value: shared.length,
                    type: 'keyword'
                });
            }

            // 2. Semantic-based links (Strength 2)
            const embA = embeddingMap.get(nodes[i].id);
            const embB = embeddingMap.get(nodes[j].id);
            if (embA && embB) {
                const sim = cosineSimilarity(embA, embB);
                if (sim > 0.75) { // High conceptual similarity
                    links.push({
                        source: nodes[i].id,
                        target: nodes[j].id,
                        value: sim * 5,
                        type: 'semantic'
                    });
                }
            }
        }
    }

    const graphContainer = document.getElementById('graph-container')!;
    const graph = ForceGraph()(graphContainer)
        .graphData({ nodes, links })
        .nodeLabel((node: any) => `${node.name}<br/>Topics: ${node.keywords.slice(0,5).join(', ')}`)
        .nodeCanvasObject((node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = node.val / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.isSearchMatch ? '#fff' : node.color;
            ctx.fill();
            
            // Glow effect for search matches
            if (node.isSearchMatch) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#1a73e8";
            } else {
                ctx.shadowBlur = 0;
            }

            // Text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(label, node.x, node.y + node.val + (2/globalScale));
        })
        .linkWidth(link => Math.sqrt((link as any).value))
        .linkColor(link => (link as any).type === 'semantic' ? 'rgba(26, 115, 232, 0.2)' : 'rgba(255,255,255,0.05)')
        .onNodeClick((node: any) => {
            window.open(`https://www.youtube.com${node.id}`, '_blank');
        });

    document.getElementById('reset-view')?.addEventListener('click', () => {
        graph.zoomToFit(400);
    });

    const searchInput = document.getElementById('semantic-search') as HTMLInputElement;
    const resultsContainer = document.getElementById('search-results');

    searchInput?.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const query = searchInput.value.trim();
            if (resultsContainer) resultsContainer.innerHTML = '<p style="color:#aaa; font-size:0.8em;">Conceptualizing...</p>';
            
            const queryEmbedding = await AIService.getEmbedding(query);
            if (!queryEmbedding) return;

            // Update node states for visual feedback
            const allEmbeddingsForSearch = await VectorDB.getAllEmbeddings();
            nodes.forEach(node => {
                const creatorEmb = embeddingMap.get(node.id);
                if (creatorEmb) {
                    const sim = cosineSimilarity(queryEmbedding, creatorEmb);
                    node.isSearchMatch = sim > 0.6; // Highlight nodes similar to search
                }
            });

            const videoEmbeddings = allEmbeddingsForSearch.filter(e => e.id.startsWith('video:'));
            const results = videoEmbeddings.map(ve => {
                const videoId = ve.id.replace('video:', '');
                const entry = history.find(h => h.videoId === videoId);
                const score = cosineSimilarity(queryEmbedding, ve.embedding);
                return { entry, score };
            })
            .filter(r => r.entry)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

            if (resultsContainer) {
                if (results.length === 0) {
                    resultsContainer.innerHTML = '<p style="color:#aaa; font-size:0.8em;">No conceptual matches.</p>';
                } else {
                    resultsContainer.innerHTML = results.map(r => `
                        <div style="background: rgba(255,255,255,0.1); padding: 5px; margin-bottom: 5px; border-radius: 4px; border-left: 2px solid #1a73e8;">
                            <a href="https://www.youtube.com/watch?v=${r.entry?.videoId}" target="_blank" style="color:#fff; text-decoration:none; font-size:0.85em; font-weight:bold;">
                                ${r.entry?.title || 'Unknown Video'}
                            </a>
                            <div style="font-size:0.7em; color:#aaa;">Conceptual Match: ${Math.round(r.score * 100)}%</div>
                        </div>
                    `).join('');
                }
            }
            
            graph.zoomToFit(400); // Re-center to show highlights
        }
    });

    // ... Export logic remains same ...
    document.getElementById('export-json')?.addEventListener('click', async () => {
        const data = await Storage.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `curator-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('export-obsidian')?.addEventListener('click', async () => {
        const history = await Storage.getHistory();
        const creators = await Storage.getCreators();
        let markdown = '# Curator Watch Log\n\n';
        history.reverse().forEach(entry => {
            const creator = creators[entry.channelId]?.name || entry.channelId;
            markdown += `## ${entry.title || entry.videoId}\n**Creator:** ${creator}\n**Date:** ${new Date(entry.timestamp).toLocaleString()}\n**Link:** https://www.youtube.com/watch?v=${entry.videoId}\n\n`;
            if (entry.summary) markdown += `### Summary\n${entry.summary}\n\n`;
            if (entry.annotations && entry.annotations.length > 0) {
                markdown += `### Notes\n`;
                entry.annotations.forEach(n => {
                    const time = new Date(n.timestamp * 1000).toISOString().substr(11, 8);
                    markdown += `- **[${time}](https://www.youtube.com/watch?v=${entry.videoId}&t=${Math.floor(n.timestamp)})**: ${n.note}\n`;
                });
                markdown += '\n';
            }
            markdown += '---\n\n';
        });
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `curator-obsidian-log-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
    });
}

document.addEventListener('DOMContentLoaded', initGalaxy);
