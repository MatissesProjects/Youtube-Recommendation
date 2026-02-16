import { Storage } from './storage';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded.');
  const statusElement = document.getElementById('status');
  const creatorsList = document.getElementById('creators-list');
  const suggestionsList = document.getElementById('suggestions-list');
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
      .sort((a, b) => b.loyaltyScore - a.loyaltyScore);

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

  async function renderSuggestions() {
    const suggestions = await Storage.getSuggestions();
    const newSuggestions = suggestions.filter(s => s.status === 'new').slice(0, 5);

    if (suggestionsList) {
      if (newSuggestions.length === 0) {
        suggestionsList.innerHTML = '<p>No new suggestions. Try "Discover New".</p>';
      } else {
        suggestionsList.innerHTML = newSuggestions.map(s => `
          <div class="creator-item suggestion-item" data-id="${s.channelId}">
            <div class="info">
              <a href="https://www.youtube.com${s.channelId}" target="_blank" class="name">${s.channelId.replace('/@', '').replace('/', '')}</a>
              <span class="reason">${s.reason}</span>
            </div>
            <div class="suggestion-actions">
              <button class="small-btn follow-btn" title="Follow">✓</button>
              <button class="small-btn ignore-btn" title="Ignore">×</button>
            </div>
          </div>
        `).join('');

        // Add event listeners to buttons
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
  if (statusElement) {
    statusElement.textContent = 'The Curator is active.';
  }
});
