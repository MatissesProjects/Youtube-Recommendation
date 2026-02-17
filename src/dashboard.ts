import ForceGraph from 'force-graph';
import { Storage } from './storage';
import { Creator } from './types';

async function initGalaxy() {
    const creatorsMap = await Storage.getCreators();
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
