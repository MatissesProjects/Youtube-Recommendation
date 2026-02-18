import { EnrichmentService } from './enrichmentService';

console.log('The Curator: Research scraper active.');

async function scrapeGoogle() {
    // Detect Bot/CAPTCHA page
    const isBotPage = document.title.includes('Sorry!') || 
                      document.title.includes('About this page') ||
                      document.body.textContent?.includes('unusual traffic from your computer network') ||
                      window.location.pathname.includes('/sorry/');

    if (isBotPage) {
        console.warn('The Curator: Bot check detected! Notifying background worker to stop.');
        chrome.runtime.sendMessage({ action: 'botCheckDetected' });
        
        const warning = document.createElement('div');
        warning.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#d93025; color:white; padding:15px; text-align:center; z-index:2147483647; font-weight:bold; font-family:sans-serif; font-size: 1.2em;';
        warning.textContent = '⚠️ BOT CHECK DETECTED. The Curator has paused all background research to protect your account. Please solve the CAPTCHA or wait a few hours.';
        document.body.appendChild(warning);
        return;
    }

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

    // 1. Try to find the AI Overview (SGE) content
    // Google uses various classes, but often it's in a container with specific data attributes or within a "complementary" role
    const aiOverviewSelectors = [
        '[data-itp="ai_overview"]',
        '.M7vSre',
        '.X79vV',
        '[role="complementary"] div'
    ];
    
    let aiText = '';
    for (const selector of aiOverviewSelectors) {
        const el = document.querySelector(selector);
        // Ensure it's the actual AI block by checking for common text
        if (el && (el.textContent?.includes('AI Overview') || el.textContent?.includes('Generative AI'))) {
            aiText = el.textContent.trim();
            console.log('The Curator: Found AI Overview content!');
            break;
        }
    }

    // 2. Scrape traditional snippets as fallback/supplement
    const snippets = Array.from(document.querySelectorAll('.VwiC3b, .bAWN9b, .MUF6yc, .g'))
        .map(el => el.textContent)
        .filter(Boolean)
        .join('\n\n');

    const combinedData = aiText ? `AI OVERVIEW:\n${aiText}\n\nSEARCH RESULTS:\n${snippets}` : snippets;

    if (combinedData.length > 100) {
        console.log(`The Curator: Found ${combinedData.length} characters of research data.`);
        
        chrome.runtime.sendMessage({
            action: 'processResearch',
            creatorName: creatorName,
            data: combinedData
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
