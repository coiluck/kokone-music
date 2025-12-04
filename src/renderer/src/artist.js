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
      // const tracks = await window.music.getByArtist(artist);
      // 後で書く
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