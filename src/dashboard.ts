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
    const creators = Object.values(creatorsMap).filter(c => {
        // Hide "Low Information" nodes that only have defaults
        if (c.frequency < 2 && (!c.enrichedDescription || c.enrichedDescription.includes('offline'))) return false;
        return c.frequency >= 1;
    });
    const stopWordsSet = new Set(CONFIG.STOP_WORDS);
    
    const embeddingMap = new Map(allEmbeddings.map(e => [e.id, e.embedding]));

    const nodes: any[] = creators.map(c => {
        const creatorKeywords = Object.entries(c.keywords || {})
            .filter(([k]) => !stopWordsSet.has(k))
            .sort((a, b) => b[1] - a[1]);
        
        // Find most frequent category for this creator
        const creatorHistory = history.filter(h => h.channelId === c.id);
        const categoryFreq: Record<string, number> = {};
        creatorHistory.forEach(h => {
            if (h.category) categoryFreq[h.category] = (categoryFreq[h.category] || 0) + 1;
        });
        const topCategory = Object.entries(categoryFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

        // Simple hash function for consistent colors based on primary keyword
        let hash = 0;
        const colorSeed = topCategory; 
        for (let i = 0; i < colorSeed.length; i++) {
            hash = colorSeed.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        
        const nodeVal = Math.max(4, (c.loyaltyScore / 8));

        return {
            id: c.id,
            name: c.name,
            val: isNaN(nodeVal) ? 4 : nodeVal, 
            color: `hsl(${hue}, 70%, 60%)`,
            keywords: creatorKeywords.map(([k]) => k),
            category: topCategory,
            isSearchMatch: false
        };
    });

    const nodeIds = new Set(nodes.map(n => n.id));
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

            const sharedCategory = nodes[i].category === nodes[j].category && nodes[i].category !== 'General';

            // Relaxed thresholds for more links
            if (shared.length >= 1 || semanticSim > 0.70 || sharedCategory) {
                let value = (shared.length * 4) + (semanticSim * 20);
                if (sharedCategory) value += 5;

                links.push({
                    source: nodes[i].id,
                    target: nodes[j].id,
                    value: value,
                    type: semanticSim > 0.80 ? 'semantic' : (sharedCategory ? 'category' : 'keyword')
                });
            }
        }
    }

    // 2. Social Links (Endorsements)
    creators.forEach(c => {
        if (c.endorsements) {
            c.endorsements.forEach(targetId => {
                if (nodeIds.has(targetId)) {
                    links.push({
                        source: c.id,
                        target: targetId,
                        value: 20, 
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
        if (!nodeIds.has(a.channelId) || !nodeIds.has(b.channelId)) continue;

        const timeDiff = Math.abs(a.timestamp - b.timestamp);
        
        if (timeDiff < 30 * 60 * 1000 && a.channelId !== b.channelId) {
            const existing = links.find(l => 
                (l.source === a.channelId && l.target === b.channelId) ||
                (l.source === b.channelId && l.target === a.channelId)
            );
            
            if (existing) {
                existing.value += 5;
                if (existing.type === 'keyword') existing.type = 'temporal';
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

    console.log(`The Curator: Rendering galaxy with ${nodes.length} nodes and ${links.length} links.`);

    const graphContainer = document.getElementById('graph-container')!;
    const detailsPanel = document.getElementById('details-panel')!;
    const suggestions = await Storage.getSuggestions();

    const graph = ForceGraph()(graphContainer)
        .graphData({ nodes, links })
        .nodeLabel((node: any) => {
            const creator = creatorsMap[node.id];
            const description = creator?.enrichedDescription ? `<br/><i style="color: #aaa;">${creator.enrichedDescription}</i>` : '';
            return `<strong>${node.name}</strong> [${node.category}]${description}<br/>Topics: ${node.keywords.slice(0,5).join(', ')}`;
        })
        .nodeCanvasObject((node: any, ctx, globalScale) => {
            if (!node || node.x === undefined || node.y === undefined) return;

            const label = node.name || 'Unknown';
            const size = Math.max(0.1, node.val || 4);
            const fontSize = Math.max(1, 12 / globalScale);
            
            ctx.save();
            
            // Draw Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.isSearchMatch ? '#fff' : (node.color || '#4285f4');
            ctx.fill();
            
            // Draw Glow for matches
            if (node.isSearchMatch) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#1a73e8";
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1 / globalScale;
                ctx.stroke();
            }

            // Draw Label
            if (globalScale > 1.2) {
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#eee';
                ctx.fillText(label, node.x, node.y + size + fontSize);
            }
            
            ctx.restore();
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
        .onNodeClick(async (node: any) => {
            if (!node) return;
            
            const creator = creatorsMap[node.id];
            if (!creator) return;

            // Show Panel
            detailsPanel.style.display = 'block';
            document.getElementById('creator-name')!.textContent = creator.name;
            document.getElementById('creator-vibe')!.textContent = creator.enrichedDescription || "Building interest profile...";
            (document.getElementById('visit-channel') as HTMLAnchorElement).href = normalizeYoutubeUrl(creator.id);

            const nodeEmb = embeddingMap.get(node.id);
            
            // 1. Find similar existing creators
            const similarExisting = nodes
                .filter(n => n.id !== node.id)
                .map(n => {
                    const otherEmb = embeddingMap.get(n.id);
                    let score = 0;
                    if (nodeEmb && otherEmb) score = cosineSimilarity(nodeEmb, otherEmb);
                    else {
                        // Fallback to keyword overlap
                        const shared = n.keywords.filter((k: string) => node.keywords.includes(k));
                        score = shared.length / 10;
                    }
                    return { name: n.name, id: n.id, score };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            document.getElementById('similar-existing')!.innerHTML = similarExisting.map(s => `
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <a href="${normalizeYoutubeUrl(s.id)}" target="_blank" style="color: #4285f4; text-decoration: none;">${s.name}</a>
                    <span style="font-size: 0.8em; color: #666;">${Math.round(s.score * 100)}% match</span>
                </div>
            `).join('') || '<p style="color: #666;">No similar creators found yet.</p>';

            // 2. Find similar new discoveries (suggestions)
            const nodeKeywords = new Set(node.keywords);
            const similarNew = suggestions
                .filter(s => s.status === 'new')
                .map(s => {
                    // Match based on keywords in the reason/ID
                    const reasonLower = s.reason.toLowerCase();
                    const matches = Array.from(nodeKeywords).filter(k => reasonLower.includes(k.toLowerCase()));
                    return { ...s, matchCount: matches.length };
                })
                .filter(s => s.matchCount > 0 || (creator.endorsements?.includes(s.channelId)))
                .sort((a, b) => b.matchCount - a.matchCount)
                .slice(0, 5);

            document.getElementById('similar-suggestions')!.innerHTML = similarNew.map(s => `
                <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <div style="font-weight: bold; color: #f4b400;">${s.channelId.replace('/@', '').replace('/', '')}</div>
                    <div style="font-size: 0.9em; color: #aaa; margin-top: 2px;">${s.reason}</div>
                    <a href="https://www.youtube.com${s.channelId}" target="_blank" style="display: inline-block; margin-top: 5px; color: #1a73e8; text-decoration: none; font-size: 0.9em;">View Channel →</a>
                </div>
            `).join('') || '<p style="color: #666;">Try clicking "Discover New" in the popup to find more connections.</p>';
        })
        .onNodeHover(node => {
            graphContainer.style.cursor = node ? 'pointer' : 'default';
        });

    document.getElementById('close-details')?.addEventListener('click', () => {
        detailsPanel.style.display = 'none';
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
