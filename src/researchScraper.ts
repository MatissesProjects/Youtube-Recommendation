import { EnrichmentService } from './enrichmentService';

console.log('The Curator: Research scraper active.');

async function scrapeGoogle() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    // Support both old and new query formats
    const isCuratorQuery = query.includes('youtube channel niche topics summary') || 
                           query.includes('general channel information');
    
    if (!isCuratorQuery) return;

    let creatorName = '';
    if (query.startsWith('youtube channel ')) {
        creatorName = query.replace('youtube channel ', '').split(' general channel information')[0];
    } else {
        creatorName = query.split(' youtube channel')[0];
    }

    if (!creatorName) return;

    console.log(`The Curator: Researching "${creatorName}"...`);
    
    // Visual indicator for the user
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#1a73e8; color:white; padding:10px; text-align:center; z-index:2147483647; font-weight:bold; font-family:sans-serif;';
    banner.textContent = `The Curator is researching "${creatorName}"... This tab will close automatically.`;
    document.body.appendChild(banner);

    // Scrape snippets from the search results
    const snippets = Array.from(document.querySelectorAll('.VwiC3b, .bAWN9b, .MUF6yc'))
        .map(el => el.textContent)
        .filter(Boolean)
        .join('\n\n');

    if (snippets.length > 100) {
        console.log(`The Curator: Found ${snippets.length} characters of research data.`);
        
        // Find the channel ID from the storage to match the name
        // This is a bit tricky since we only have the name in the query.
        // We'll send a message to background to find the ID and then enrich.
        chrome.runtime.sendMessage({
            action: 'processResearch',
            creatorName: creatorName,
            data: snippets
        });

        // Close the tab after a few seconds to clean up
        setTimeout(() => {
            // window.close() might be blocked, but we'll try
            // console.log('The Curator: Research complete for this creator.');
        }, 5000);
    }
}

// Wait for results to load
setTimeout(scrapeGoogle, 3000);
