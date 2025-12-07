// src/renderer/src/playlist.js
export async function setupPlaylist() {
  document.getElementById('playlist-container').innerHTML = '';
  setUpAddPlaylist();
  setUpPlaylistList();
}

function setUpAddPlaylist() {
  const addPlaylistButton = document.createElement('div');
  addPlaylistButton.classList.add('playlist-item', 'playlist-item-add');
  addPlaylistButton.innerHTML = `
    <div class="playlist-item-icon-container">
      <div class="playlist-item-icon playlist-item-add"></div>
    </div>
    <div class="playlist-item-text">
      <div class="playlist-item-name">新規作成</div>
      <div class="playlist-item-description">Click to create a new playlist</div>
    </div>
  `;
  addPlaylistButton.addEventListener('click', () => {
    openSubModal();
  });
  document.getElementById('playlist-container').appendChild(addPlaylistButton);
}

import { secondsToMinutes } from './modules/music';

async function openSubModal() {
  const allMusic = await window.music.getAllMusic();
  allMusic.sort((a, b) => a.title.localeCompare(b.title, 'ja'));

  const subModal = document.createElement('div');
  subModal.classList.add('playlist-submodal-overlay', 'submodal');

  const subModalContainer = document.createElement('div');
  subModalContainer.classList.add('playlist-submodal-container');

  subModalContainer.innerHTML = `
    <p class="playlist-submodal-title">新規作成</p>

    <div class="playlist-form-container">
      <div class="playlist-form-item">
        <label for="playlist-title">タイトル</label>
        <input type="text" id="playlist-title" class="playlist-input" placeholder="プレイリスト名を入力" spellcheck="false">
      </div>
      <div class="playlist-form-item">
        <label for="playlist-select-container">曲を選択</label>
        <div id="playlist-select-container" class="playlist-select-container">
          <!-- atode -->
        </div>
      </div>
    </div>

    <div class="playlist-buttons">
      <button id="playlist-btn-cancel" class="playlist-btn cancel">キャンセル</button>
      <button id="playlist-btn-save" class="playlist-btn save">保存</button>
    </div>
  `;

  document.getElementById('main-content').appendChild(subModal);
  subModal.appendChild(subModalContainer);

  allMusic.forEach(music => {
    const item = document.createElement('div');
    item.classList.add('playlist-select-item');

    item.innerHTML = `
      <div class="playlist-select-checkbox-container">
        <input type="checkbox" class="playlist-track-checkbox" value="${music.id}">
      </div>
      <div class="playlist-list-item-icon-container">
        <div class="playlist-list-item-icon"></div>
      </div>
      <div class="playlist-select-item-text">
        <span class="playlist-select-item-title">${music.title}</span>
        <div class="playlist-select-item-info">
          <div class="playlist-select-item-info-left">
            <span class="playlist-select-item-artist">${music.artist}</span>
            <span class="playlist-select-item-separator">・</span>
            <span class="playlist-select-item-duration">${secondsToMinutes(music.duration)}</span>
          </div>
          <div class="playlist-select-item-tags">
            ${music.tags.map(tag => `<span class="playlist-select-item-tag">${tag}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;

      const checkbox = item.querySelector('.playlist-track-checkbox');
      checkbox.checked = !checkbox.checked;
    });

    document.getElementById('playlist-select-container').appendChild(item);
  });

  // キャンセルボタン
  document.getElementById('playlist-btn-cancel').addEventListener('click', () =>  {
    removeModal();
  });
  // 背景クリック
  subModal.addEventListener('click', (e) => {
    if (e.target === subModal) {
      removeModal();
    }
  });
  function removeModal() {
    subModal.remove();
  }

  // 保存ボタン
  document.getElementById('playlist-btn-save').addEventListener('click', async () => {
    const title = document.getElementById('playlist-title').value.trim();
    if (!title) {
      alert('プレイリスト名を入力してください');
      return;
    }

    // チェックされた曲のIDを取得
    const checkboxes = document.getElementById('playlist-select-container').querySelectorAll('.playlist-track-checkbox:checked');
    const selectedTrackIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedTrackIds.length === 0) {
      alert('曲を選択してください');
      return;
    }

    try {
      const result = await window.playlist.create(title);

      if (result.success) {
        const playlistId = result.playlist.id;
        if (selectedTrackIds.length > 0) {
          await Promise.all(selectedTrackIds.map(trackId =>
            window.playlist.addTrack(playlistId, trackId)
          ));
        }
        await setUpPlaylistList();
        removeModal();
      } else {
        console.error('プレイリストの作成に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('エラーが発生しました: ' + error);
    }
  });
}

async function setUpPlaylistList() {
  const allPlaylists = await window.playlist.getAll();

  for (const playlist of allPlaylists) {
    const playlistElement = document.createElement('div');
    playlistElement.classList.add('playlist-item');
    playlistElement.innerHTML = `
      <div class="playlist-item-icon-container">
        <div class="playlist-item-icon"></div>
      </div>
      <div class="playlist-item-text">
        <div class="playlist-item-name">${playlist.name}</div>
        <div class="playlist-item-songs-count">${playlist.trackIds.length} songs</div>
      </div>
    `;
    document.getElementById('playlist-container').appendChild(playlistElement);
  }
}