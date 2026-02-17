import { Storage, Creator } from './storage';
import { VectorDB, cosineSimilarity } from './vectorDb';
import { GenerativeService } from './generativeService';
import { CONFIG } from './constants';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded.');
  const statusElement = document.getElementById('status');
  const aiStatusElement = document.getElementById('ai-status');
  const creatorsList = document.getElementById('creators-list');
  const suggestionsList = document.getElementById('suggestions-list');
  const topicsList = document.getElementById('topics-list');
  const recentList = document.getElementById('recent-list');
  const favoriteVideosList = document.getElementById('favorite-videos-list');
  const importBtn = document.getElementById('import-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const discoverBtn = document.getElementById('discover-btn');
  const nukeBtn = document.getElementById('nuke-btn');

  async function renderCreators() {
    const creators = await Storage.getCreators();
    const creatorCount = Object.keys(creators).length;
    if (statusElement) statusElement.textContent = `Tracking ${creatorCount} creators.`;

    const sortedCreators = Object.values(creators)
      .filter(c => c.frequency >= 2)
      .sort((a, b) => {
        if (b.loyaltyScore !== a.loyaltyScore) {
          return b.loyaltyScore - a.loyaltyScore;
        }
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        return a.name.localeCompare(b.name);
      });

    if (creatorsList) {
      if (sortedCreators.length === 0) {
        creatorsList.innerHTML = '<p>No creators tracked yet. Watch some videos!</p>';
      } else {
        creatorsList.innerHTML = sortedCreators.slice(0, 10).map(c => `
          <div class="creator-item">
            <span class="name">${c.name}</span>
            <span class="score">${c.loyaltyScore}</span>
          </div>
        `).join('');
      }
    }
  }

  async function renderTopTopics() {
    const creators = await Storage.getCreators();
    const keywordMap: Record<string, number> = {};

    Object.values(creators).forEach(c => {
      if (c.keywords) {
        Object.entries(c.keywords).forEach(([word, count]) => {
          keywordMap[word] = (keywordMap[word] || 0) + count;
        });
      }
    });

    const sortedKeywords = Object.entries(keywordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (topicsList) {
      if (sortedKeywords.length === 0) {
        topicsList.innerHTML = '<p class="small-text">Watch more videos to build your profile.</p>';
      } else {
        topicsList.innerHTML = `
          <div class="topic-cloud">
            ${sortedKeywords.map(([word, count]) => `
              <span class="topic-tag" style="font-size: ${Math.max(0.7, Math.min(1.2, 0.7 + count * 0.05))}em">
                ${word}
              </span>
            `).join('')}
          </div>
        `;
      }
    }
  }

  async function renderRecentHits() {
    const history = await Storage.getHistory();
    const recent = history.filter(h => h.title).reverse().slice(0, 3);

    if (recentList) {
      if (recent.length === 0) {
        recentList.innerHTML = '<p class="small-text">Finish a video to see recent hits.</p>';
      } else {
        recentList.innerHTML = recent.map(h => `
          <div class="recent-item">
            <span class="recent-title">${h.title}</span>
          </div>
        `).join('');
      }
    }
  }

  async function renderLatestVideos() {
    const creators = await Storage.getCreators();
    const topLoyal = Object.values(creators)
      .filter(c => c.loyaltyScore > 70 && c.latestVideo)
      .sort((a, b) => (b.latestVideo?.published || 0) - (a.latestVideo?.published || 0))
      .slice(0, 3);

    if (favoriteVideosList) {
      if (topLoyal.length === 0) {
        favoriteVideosList.innerHTML = '<p class="small-text">No new videos from your high-loyalty creators.</p>';
      } else {
        favoriteVideosList.innerHTML = topLoyal.map(c => `
          <div class="video-alert">
            <span class="creator-badge">${c.name}</span>
            <a href="https://www.youtube.com/watch?v=${c.latestVideo?.id}" target="_blank" class="video-link">
              ${c.latestVideo?.title}
            </a>
          </div>
        `).join('');
      }
    }
  }

  async function renderSuggestions() {
    const suggestions = await Storage.getSuggestions();
    const creators = await Storage.getCreators();
    
    const allEmbeddings = await VectorDB.getAllEmbeddings();
    const topCreators = Object.values(creators)
      .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
      .slice(0, 10);
    const topCreatorIds = new Set(topCreators.map(c => c.id));
    
    const userEmbeddings = allEmbeddings.filter(e => topCreatorIds.has(e.id));
    let centroid: number[] | null = null;

    if (userEmbeddings.length > 0) {
      const dim = userEmbeddings[0]!.embedding.length;
      centroid = new Array(dim).fill(0);
      userEmbeddings.forEach(e => {
        for (let i = 0; i < dim; i++) {
          centroid![i] += e.embedding[i] || 0;
        }
      });
      for (let i = 0; i < dim; i++) {
        centroid![i] /= userEmbeddings.length;
      }
    }

    const newSuggestions = suggestions.filter(s => s.status === 'new');
    
    const rankedSuggestions = [];
    for (const s of newSuggestions) {
      let score = 0;
      let matchedCreator: Creator | null = null;
      let matchKeywords: string[] = [];

      if (centroid) {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'generateEmbedding',
          text: `${s.channelId} ${s.reason}`
        });

        if (response && response.success) {
          const suggestionEmbedding = response.embedding;
          score = cosineSimilarity(centroid, suggestionEmbedding);

          let maxSim = -1;
          for (const ue of userEmbeddings) {
            const sim = cosineSimilarity(ue.embedding, suggestionEmbedding);
            if (sim > maxSim) {
              maxSim = sim;
              matchedCreator = creators[ue.id] || null;
            }
          }

          if (matchedCreator && matchedCreator.keywords) {
            const topKeywords = Object.keys(matchedCreator.keywords).slice(0, 5);
            const reasonLower = s.reason.toLowerCase();
            matchKeywords = topKeywords.filter(k => reasonLower.includes(k));
          }
        }
      } else {
        const keywordMap: Record<string, number> = {};
        Object.values(creators).forEach(c => {
          if (c.keywords) {
            Object.entries(c.keywords).forEach(([word, count]) => {
              keywordMap[word] = (keywordMap[word] || 0) + count;
            });
          }
        });
        const reasonWords = s.reason.toLowerCase().split(/\s+/);
        reasonWords.forEach(word => {
          if (keywordMap[word]) score += keywordMap[word] / 100;
        });
      }

      let aiReason = s.reason;
      if (matchedCreator && score > CONFIG.SEMANTIC_MATCH_THRESHOLD) {
        // Use Generative AI for the reason if we have a strong match
        aiReason = await GenerativeService.generateReason(
            s.channelId.replace('/@', '').replace('/', ''),
            matchedCreator.name,
            matchKeywords
        );
      }

      rankedSuggestions.push({ ...s, matchScore: score, aiReason });
    }

    const displaySuggestions = rankedSuggestions
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    if (suggestionsList) {
      if (displaySuggestions.length === 0) {
        suggestionsList.innerHTML = '<p>No new suggestions. Try "Discover New".</p>';
      } else {
        suggestionsList.innerHTML = displaySuggestions.map(s => `
          <div class="creator-item suggestion-item" data-id="${s.channelId}">
            <div class="info">
              <a href="https://www.youtube.com${s.channelId}" target="_blank" class="name">${s.channelId.replace('/@', '').replace('/', '')}</a>
              <span class="reason ai-insight">${s.aiReason}</span>
            </div>
            <div class="suggestion-actions">
              <button class="small-btn follow-btn" title="Follow">✓</button>
              <button class="small-btn ignore-btn" title="Ignore">×</button>
            </div>
          </div>
        `).join('');

        suggestionsList.querySelectorAll('.follow-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = (e.target as HTMLElement).closest('.suggestion-item')?.getAttribute('data-id');
            if (id) {
              await Storage.updateSuggestionStatus(id, 'followed');
              renderSuggestions();
            }
          });
        });

        suggestionsList.querySelectorAll('.ignore-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = (e.target as HTMLElement).closest('.suggestion-item')?.getAttribute('data-id');
            if (id) {
              await Storage.updateSuggestionStatus(id, 'ignored');
              renderSuggestions();
            }
          });
        });
      }
    }
  }

  importBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'importHistory' });
    if (statusElement) statusElement.textContent = 'Importing history...';
  });

  refreshBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'refreshScores' }, (response) => {
      if (response && response.success) {
        renderCreators();
        if (statusElement) statusElement.textContent = 'Scores updated!';
      }
    });
  });

  discoverBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'discover' });
    if (statusElement) statusElement.textContent = 'Discovering new creators...';
  });

  nukeBtn?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      await Storage.clearAll();
      renderCreators();
      renderSuggestions();
      if (statusElement) statusElement.textContent = 'All data nuked.';
    }
  });

  renderCreators();
  renderSuggestions();
  renderTopTopics();
  renderRecentHits();
  renderLatestVideos();

  const allEmbeddings = await VectorDB.getAllEmbeddings();
  if (aiStatusElement) {
    if (allEmbeddings.length > 0) {
      aiStatusElement.textContent = `Semantic Engine: Active (${allEmbeddings.length} vibes indexed)`;
    } else {
      aiStatusElement.textContent = 'Semantic Engine: Ready (Waiting for data)';
    }
  }

  if (statusElement) {
    statusElement.textContent = 'The Curator is active.';
  }
});
