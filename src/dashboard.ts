import ForceGraph from 'force-graph';
import { Storage } from './storage';
import { Creator, HistoryEntry } from './types';
import { VectorDB, cosineSimilarity } from './vectorDb';
import { AIService } from './aiService';
import { CONFIG } from './constants';

async function initGalaxy() {
    const creatorsMap = await Storage.getCreators();
    const history = await Storage.getHistory();
    const allEmbeddings = await VectorDB.getAllEmbeddings();
    const creators = Object.values(creatorsMap).filter(c => c.frequency >= 1);
    const stopWordsSet = new Set(CONFIG.STOP_WORDS);
    
    const embeddingMap = new Map(allEmbeddings.map(e => [e.id, e.embedding]));

    const nodes: any[] = creators.map(c => ({
        id: c.id,
        name: c.name,
        val: Math.max(4, (c.loyaltyScore / 8)), 
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        keywords: Object.keys(c.keywords || {}).filter(k => !stopWordsSet.has(k)),
        isSearchMatch: false
    }));

    const links: any[] = [];

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const shared = nodes[i].keywords.filter((k: string) => nodes[j].keywords.includes(k));
            const embA = embeddingMap.get(nodes[i].id);
            const embB = embeddingMap.get(nodes[j].id);
            let semanticSim = 0;
            if (embA && embB) {
                semanticSim = cosineSimilarity(embA, embB);
            }

            if (shared.length >= 2 || semanticSim > 0.85) {
                links.push({
                    source: nodes[i].id,
                    target: nodes[j].id,
                    value: (shared.length * 2) + (semanticSim * 10),
                    type: semanticSim > 0.85 ? 'semantic' : 'keyword'
                });
            }
        }
    }

    const graphContainer = document.getElementById('graph-container')!;
    const graph = ForceGraph()(graphContainer)
        .graphData({ nodes, links })
        .nodeLabel((node: any) => `${node.name}<br/>Topics: ${node.keywords.slice(0,5).join(', ')}`)
        .nodeCanvasObject((node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 14 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw Node
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.isSearchMatch ? '#fff' : node.color;
            ctx.fill();
            
            // Draw Label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.isSearchMatch ? '#fff' : '#eee';
            
            if (globalScale > 1.5) { // Only draw text when zoomed in enough
                ctx.fillText(label, node.x, node.y + node.val + fontSize);
            }

            // Glow for matches
            if (node.isSearchMatch) {
                ctx.strokeStyle = '#1a73e8';
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
            }
        })
        .d3Force('charge', (d3: any) => d3.forceManyBody().strength(-200))
        .d3Force('link', (d3: any) => d3.forceLink().distance(d => 150 / (d as any).value))
        .linkWidth(link => Math.sqrt((link as any).value))
        .linkColor(link => (link as any).type === 'semantic' ? 'rgba(26, 115, 232, 0.2)' : 'rgba(255,255,255,0.05)')
        .onNodeClick((node: any) => {
            if (node.id) window.open(`https://www.youtube.com${node.id}`, '_blank');
        })
        .onNodeHover(node => {
            graphContainer.style.cursor = node ? 'pointer' : null as any;
        });

    const searchInput = document.getElementById('semantic-search') as HTMLInputElement;
    const resultsContainer = document.getElementById('search-results');

    searchInput?.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const query = searchInput.value.trim();
            const queryEmbedding = await AIService.getEmbedding(query);
            if (!queryEmbedding) return;

            nodes.forEach(node => {
                const creatorEmb = embeddingMap.get(node.id);
                if (creatorEmb) {
                    const sim = cosineSimilarity(queryEmbedding, creatorEmb);
                    node.isSearchMatch = sim > 0.65;
                }
            });

            const results = allEmbeddings.filter(e => e.id.startsWith('video:')).map(ve => {
                const videoId = ve.id.replace('video:', '');
                const entry = history.find(h => h.videoId === videoId);
                const score = cosineSimilarity(queryEmbedding, ve.embedding);
                return { entry, score };
            })
            .filter(r => r.entry)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

            if (resultsContainer) {
                resultsContainer.innerHTML = results.map(r => `
                    <div style="background: rgba(255,255,255,0.1); padding: 5px; margin-bottom: 5px; border-radius: 4px; border-left: 2px solid #1a73e8;">
                        <a href="https://www.youtube.com/watch?v=${r.entry?.videoId}" target="_blank" style="color:#fff; text-decoration:none; font-size:0.85em;">
                            ${r.entry?.title || 'Video'}
                        </a>
                    </div>
                `).join('');
            }
            
            graph.zoomToFit(400);
        }
    });

    document.getElementById('reset-view')?.addEventListener('click', () => graph.zoomToFit(400));
    document.getElementById('export-json')?.addEventListener('click', async () => {
        const data = await Storage.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `curator-export.json`;
        a.click();
    });
}

document.addEventListener('DOMContentLoaded', initGalaxy);
