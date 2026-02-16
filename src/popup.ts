import { Storage } from './storage';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded.');
  const statusElement = document.getElementById('status');
  const creatorsList = document.getElementById('creators-list');
  const importBtn = document.getElementById('import-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const discoverBtn = document.getElementById('discover-btn');

  async function renderCreators() {
    const creators = await Storage.getCreators();
    const sortedCreators = Object.values(creators).sort((a, b) => b.loyaltyScore - a.loyaltyScore);

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

  renderCreators();
  if (statusElement) {
    statusElement.textContent = 'The Curator is active.';
  }
});
