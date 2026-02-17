import ForceGraph from 'force-graph';
import { Storage } from './storage';
import { Creator, HistoryEntry } from './types';
import { VectorDB, cosineSimilarity } from './vectorDb';
import { AIService } from './aiService';

async function initGalaxy() {
    const creatorsMap = await Storage.getCreators();
    const history = await Storage.getHistory();
    const creators = Object.values(creatorsMap).filter(c => c.frequency >= 1);
    
    const nodes = creators.map(c => ({
        id: c.id,
        name: c.name,
        val: Math.max(2, (c.loyaltyScore / 10)), // Size based on loyalty
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        keywords: Object.keys(c.keywords || {})
    }));

    const links: { source: string, target: string, value: number }[] = [];

    // Create links based on shared keywords
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const shared = nodes[i]!.keywords.filter(k => nodes[j]!.keywords.includes(k));
            if (shared.length >= 2) {
                links.push({
                    source: nodes[i]!.id,
                    target: nodes[j]!.id,
                    value: shared.length
                });
            }
        }
    }

    const graph = ForceGraph()(document.getElementById('graph-container')!)
        .graphData({ nodes, links })
        .nodeLabel((node: any) => `${node.name}<br/>Topics: ${node.keywords.slice(0,5).join(', ')}`)
        .nodeAutoColorBy('id')
        .linkWidth(link => Math.sqrt((link as any).value))
        .linkColor(() => 'rgba(255,255,255,0.1)')
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
            if (resultsContainer) resultsContainer.innerHTML = '<p style="color:#aaa; font-size:0.8em;">Thinking...</p>';
            
            const queryEmbedding = await AIService.getEmbedding(query);
            if (!queryEmbedding) return;

            const allEmbeddings = await VectorDB.getAllEmbeddings();
            const videoEmbeddings = allEmbeddings.filter(e => e.id.startsWith('video:'));

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
                    resultsContainer.innerHTML = '<p style="color:#aaa; font-size:0.8em;">No matches found.</p>';
                } else {
                    resultsContainer.innerHTML = results.map(r => `
                        <div style="background: rgba(255,255,255,0.1); padding: 5px; margin-bottom: 5px; border-radius: 4px; border-left: 2px solid #1a73e8;">
                            <a href="https://www.youtube.com/watch?v=${r.entry?.videoId}" target="_blank" style="color:#fff; text-decoration:none; font-size:0.85em; font-weight:bold;">
                                ${r.entry?.title || 'Unknown Video'}
                            </a>
                            <div style="font-size:0.7em; color:#aaa;">Match: ${Math.round(r.score * 100)}%</div>
                        </div>
                    `).join('');
                }
            }
        }
    });

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
            markdown += `## ${entry.title || entry.videoId}\n`;
            markdown += `**Creator:** ${creator}\n`;
            markdown += `**Date:** ${new Date(entry.timestamp).toLocaleString()}\n`;
            markdown += `**Link:** https://www.youtube.com/watch?v=${entry.videoId}\n\n`;
            
            if (entry.summary) {
                markdown += `### Summary\n${entry.summary}\n\n`;
            }
            
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
