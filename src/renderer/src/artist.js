// src/renderer/src/artist.js
export async function setupArtist() {
  const allMusic = await window.music.getAllMusic();

  const artistContainer = document.getElementById('artist-container');
  artistContainer.innerHTML = '';

  const artistCounts = {};

  allMusic.forEach(track => {
    const artistName = track.artist || 'Unknown Artist';

    if (!artistCounts[artistName]) {
      artistCounts[artistName] = 0;
    }
    artistCounts[artistName]++;
  });

  const sortedArtists = Object.keys(artistCounts).sort();

  sortedArtists.forEach(artist => {
    const count = artistCounts[artist];
    const label = count === 1 ? "song" : "songs";

    const card = document.createElement('div');
    card.className = 'artist-item';

    card.innerHTML = `
      <div class="artist-item-icon-container">
        <div class="artist-item-icon"></div>
      </div>
      <div class="artist-item-text">
        <div class="artist-item-name">${escapeHtml(artist)}</div>
        <div class="artist-item-songs-count">${count} ${label}</div>
      </div>
    `;

    card.addEventListener('click', async () => {
      const tracks = await window.music.getByArtist(artist);
      tracks.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
      openSubModal(artist, tracks);
    });

    artistContainer.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

import { musicPlayer, secondsToMinutes } from './modules/music'
import { showActionMenu } from './modules/actionMusic.js';

function openSubModal(artist, tracks) {
  const subModal = document.createElement('div');
  subModal.classList.add('artist-submodal-overlay', 'submodal');

  const subModalContainer = document.createElement('div');
  subModalContainer.classList.add('artist-submodal-container');

  subModalContainer.innerHTML = `
    <p class="artist-submodal-title">${artist}</p>
  `

  for(const track of tracks) {
    subModalContainer.innerHTML += `
      <div class="artist-submodal-item">
        <div class="artist-submodal-item-icon-container">
          <div class="artist-submodal-item-icon"></div>
        </div>
        <div class="artist-submodal-item-text">
          <span class="artist-submodal-item-title">${track.title}</span>
          <div class="artist-submodal-item-info">
            <div class="artist-submodal-item-info-left">
              <span class="artist-submodal-item-artist">${track.artist}</span>
              <span class="artist-submodal-item-separator">・</span>
              <span class="artist-submodal-item-duration">${secondsToMinutes(track.duration)}</span>
            </div>
            <div class="artist-submodal-item-tags">
              ${track.tags.map(tag => `<span class="artist-submodal-item-tag">${tag}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="artist-submodal-item-actions"></div>
      </div>
    `
  }

  document.getElementById('main-content').appendChild(subModal);
  subModal.appendChild(subModalContainer);

  subModal.addEventListener('click', (e) => {
    if (e.target === subModal) {
      removeModal();
    }
  });

  function removeModal() {
    subModal.remove();
  }

  const musicItems = subModalContainer.querySelectorAll('.artist-submodal-item');
  musicItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      const track = tracks[index];
      musicPlayer.play(track.path, track, tracks);
    });
  });

  const actionButton = subModalContainer.querySelectorAll('.artist-submodal-item-actions');
  actionButton.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const track = tracks[index];
      showActionMenu(e, track);
    });
  });
}