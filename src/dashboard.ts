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
}

document.addEventListener('DOMContentLoaded', initGalaxy);
