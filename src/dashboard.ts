import ForceGraph from 'force-graph';
import { Storage } from './storage';
import { Creator, HistoryEntry } from './types';
import { VectorDB, cosineSimilarity } from './vectorDb';
import { AIService } from './aiService';
import { CONFIG } from './constants';
import { normalizeYoutubeUrl } from './utils';

async function initGalaxy() {
    const creatorsMap = await Storage.getCreators();
    const history = await Storage.getHistory();
    const allEmbeddings = await VectorDB.getAllEmbeddings();
    const creators = Object.values(creatorsMap).filter(c => c.frequency >= 1);
    const stopWordsSet = new Set(CONFIG.STOP_WORDS);
    
    const embeddingMap = new Map(allEmbeddings.map(e => [e.id, e.embedding]));

    const nodes: any[] = creators.map(c => {
        const creatorKeywords = Object.entries(c.keywords || {})
            .filter(([k]) => !stopWordsSet.has(k))
            .sort((a, b) => b[1] - a[1]);
        const primaryKeyword = creatorKeywords[0]?.[0] || 'unknown';
        
        // Find most frequent category for this creator
        const creatorHistory = history.filter(h => h.channelId === c.id);
        const categoryFreq: Record<string, number> = {};
        creatorHistory.forEach(h => {
            if (h.category) categoryFreq[h.category] = (categoryFreq[h.category] || 0) + 1;
        });
        const topCategory = Object.entries(categoryFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

        // Simple hash function for consistent colors based on primary keyword
        let hash = 0;
        const colorSeed = topCategory; // Color by category for better grouping
        for (let i = 0; i < colorSeed.length; i++) {
            hash = colorSeed.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);

        return {
            id: c.id,
            name: c.name,
            val: Math.max(4, (c.loyaltyScore / 8)), 
            color: `hsl(${hue}, 70%, 60%)`,
            keywords: creatorKeywords.map(([k]) => k),
            category: topCategory,
            isSearchMatch: false
        };
    });

    const links: any[] = [];

    // 1. Keyword & Semantic Links
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const shared = nodes[i].keywords.filter((k: string) => nodes[j].keywords.includes(k));
            const embA = embeddingMap.get(nodes[i].id);
            const embB = embeddingMap.get(nodes[j].id);
            let semanticSim = 0;
            if (embA && embB) {
                semanticSim = cosineSimilarity(embA, embB);
            }

            // Relaxed thresholds for more links
            if (shared.length >= 1 || semanticSim > 0.70 || nodes[i].category === nodes[j].category) {
                let value = (shared.length * 4) + (semanticSim * 20);
                if (nodes[i].category === nodes[j].category && nodes[i].category !== 'General') value += 5;

                links.push({
                    source: nodes[i].id,
                    target: nodes[j].id,
                    value: value,
                    type: semanticSim > 0.80 ? 'semantic' : (nodes[i].category === nodes[j].category ? 'category' : 'keyword')
                });
            }
        }
    }

    // 2. Social Links (Endorsements)
    creators.forEach(c => {
        if (c.endorsements) {
            c.endorsements.forEach(targetId => {
                if (creatorsMap[targetId]) {
                    links.push({
                        source: c.id,
                        target: targetId,
                        value: 20, // Strong connection
                        type: 'social'
                    });
                }
            });
        }
    });

    // 3. Temporal Links (Watched together in same session)
    const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sortedHistory.length - 1; i++) {
        const a = sortedHistory[i];
        const b = sortedHistory[i+1];
        const timeDiff = Math.abs(a.timestamp - b.timestamp);
        
        // If watched within 30 minutes and different creators
        if (timeDiff < 30 * 60 * 1000 && a.channelId !== b.channelId) {
            if (creatorsMap[a.channelId] && creatorsMap[b.channelId]) {
                const existing = links.find(l => 
                    (l.source === a.channelId && l.target === b.channelId) ||
                    (l.source === b.channelId && l.target === a.channelId)
                );
                
                if (existing) {
                    existing.value += 5;
                    if (existing.type === 'keyword') existing.type = 'temporal'; // Upgrade
                } else {
                    links.push({
                        source: a.channelId,
                        target: b.channelId,
                        value: 5,
                        type: 'temporal'
                    });
                }
            }
        }
    }

    const graphContainer = document.getElementById('graph-container')!;
    const graph = ForceGraph()(graphContainer)
        .graphData({ nodes, links })
        .nodeLabel((node: any) => {
            const creator = creatorsMap[node.id];
            const description = creator?.enrichedDescription ? `<br/><i style="color: #aaa;">${creator.enrichedDescription}</i>` : '';
            return `<strong>${node.name}</strong> [${node.category}]${description}<br/>Topics: ${node.keywords.slice(0,5).join(', ')}`;
        })
        .nodeCanvasObject((node: any, ctx, globalScale) => {
            // Safety check for node positions
            if (node.x === undefined || node.y === undefined) return;

            const label = node.name;
            const fontSize = Math.max(4, 12 / globalScale);
            
            // Draw Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.isSearchMatch ? '#fff' : node.color;
            ctx.fill();
            
            // Draw Glow for matches
            if (node.isSearchMatch) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#1a73e8";
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1 / globalScale;
                ctx.stroke();
            } else {
                ctx.shadowBlur = 0;
            }

            // Draw Label
            if (globalScale > 1.2) {
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#eee';
                ctx.fillText(label, node.x, node.y + node.val + fontSize);
            }
        })
        .linkWidth(link => Math.sqrt((link as any).value))
        .linkColor(link => {
            const type = (link as any).type;
            if (type === 'semantic') return 'rgba(66, 133, 244, 0.4)'; // Blue
            if (type === 'social') return 'rgba(244, 180, 0, 0.5)';   // Gold/Yellow
            if (type === 'temporal') return 'rgba(15, 157, 88, 0.4)'; // Green
            if (type === 'category') return 'rgba(234, 67, 53, 0.3)'; // Red/Coral
            return 'rgba(255, 255, 255, 0.15)'; // Keyword (White)
        })
        .onNodeClick((node: any) => {
            if (node && node.id) window.open(normalizeYoutubeUrl(node.id), '_blank');
        })
        .onNodeHover(node => {
            graphContainer.style.cursor = node ? 'pointer' : 'default';
        });

    // Improved Force Configuration for "Clumping"
    graph.d3Force('charge')!.strength(-150);
    graph.d3Force('link')!.distance((d: any) => 60 / Math.log10((d.value || 1) + 1));
    graph.d3Force('center')!.strength(0.1);

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
