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
      <div class="playlist-item-description">Create a new playlist</div>
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
      window.message.showMessage('プレイリスト名を入力してください', false);
      return;
    }

    // チェックされた曲のIDを取得
    const checkboxes = document.getElementById('playlist-select-container').querySelectorAll('.playlist-track-checkbox:checked');
    const selectedTrackIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedTrackIds.length === 0) {
      window.message.showMessage('曲を選択してください', false);
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
    playlistElement.addEventListener('click', () => {
      openPlaylistModal(playlist.id);
    });
  }
}

async function openPlaylistModal(playlistId) {
  const playlist = await window.playlist.get(playlistId);
  if (!playlist) {
    console.error('Playlist not found');
    return;
  }

  const allMusic = await window.music.getAllMusic();
  const playlistTracks = playlist.trackIds
    .map(id => allMusic.find(m => m.id === id))

  const playlistModal = document.createElement('div');
  playlistModal.classList.add('playlist-submodal-overlay', 'submodal');

  const modalContainer = document.createElement('div');
  modalContainer.classList.add('playlist-submodal-container');

  modalContainer.innerHTML = `
    <div class="playlist-submodal-header">
      <input type="text" id="playlist-edit-title" class="playlist-input" value="${playlist.name}" spellcheck="false">
      <div class="playlist-submodal-header-buttons">
        <button id="playlist-play-btn" class="playlist-btn save">▶ 再生</button>
        <button id="playlist-add-btn" class="playlist-btn add">+ 追加</button>
        <button id="playlist-delete-btn" class="playlist-btn delete">削除</button>
      </div>
    </div>

    <div id="playlist-tracks-container"></div>

    <div class="playlist-submodal-footer">
      <span class="playlist-submodal-footer-text">タイトルをクリックして編集</span>
    </div>
  `;

  document.getElementById('main-content').appendChild(playlistModal);
  playlistModal.appendChild(modalContainer);

  const tracksContainer = document.getElementById('playlist-tracks-container');

  const renderTracks = () => {
    tracksContainer.innerHTML = '';
    playlistTracks.forEach((music, index) => {
      const item = document.createElement('div');
      item.classList.add('playlist-select-item');
      item.style.gridTemplateColumns = '30px auto 1fr auto';

      item.innerHTML = `
        <div class="playlist-select-item-number">${index + 1}</div>
        <div class="playlist-select-item-icon-container">
          <div class="playlist-select-item-icon"></div>
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
        <div class="playlist-track-remove-icon"></div>
      `;

      // トラック削除
      item.querySelector('.playlist-track-remove-icon').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`「${music.title}」をプレイリストから削除しますか？`)) {
          await window.playlist.removeTrack(playlistId, music.id);
          const idx = playlistTracks.findIndex(t => t.id === music.id);
          if (idx > -1) playlistTracks.splice(idx, 1);
          renderTracks();
          await setupPlaylist();
        }
      });

      // クリックでその曲から再生
      item.addEventListener('click', (e) => {
        if(e.target.closest('.playlist-track-remove')) return;
        playPlaylist(music);
      });

      tracksContainer.appendChild(item);
    });
  };

  renderTracks();

  function removeModal() {
    playlistModal.remove();
  };

  // 背景クリックで閉じる
  playlistModal.addEventListener('click', (e) => {
    if (e.target === playlistModal) {
      removeModal();
    }
  });

  // タイトル変更
  const titleInput = document.getElementById('playlist-edit-title');
  titleInput.addEventListener('change', async () => {
    const newName = titleInput.value.trim();
    if (newName) {
      await window.playlist.changeName(playlistId, newName);
      await setupPlaylist();
    }
  });

  // プレイリスト削除
  document.getElementById('playlist-delete-btn').addEventListener('click', async () => {
    if (confirm(`プレイリスト「${playlist.name}」を完全に削除しますか？`)) {
      await window.playlist.delete(playlistId);
      await setupPlaylist();
      removeModal();
    }
  });

  // 曲追加
  document.getElementById('playlist-add-btn').addEventListener('click', () => {
    openAddMusicModal(playlistId, playlistTracks, () => {
      removeModal();
      openPlaylistModal(playlistId);
    });
  });

  const playPlaylist = (startTrack = null) => {
    if (playlistTracks.length === 0) return;
    // 最初の曲か指定された曲
    const trackToPlay = startTrack || playlistTracks[0];
    playMusic(trackToPlay, playlistTracks);
  };

  document.getElementById('playlist-play-btn').addEventListener('click', () => {
    playPlaylist();
  });
}

async function openAddMusicModal(playlistId, currentTracks, onComplete) {
  const allMusic = await window.music.getAllMusic();
  allMusic.sort((a, b) => a.title.localeCompare(b.title, 'ja'));

  // 既にプレイリストにある曲のID
  const currentTrackIds = new Set(currentTracks.map(t => t.id));

  const addModal = document.createElement('div');
  addModal.classList.add('playlist-submodal-overlay', 'submodal');
  addModal.style.zIndex = '3010'; // 3000のsubmodalより上

  const modalContainer = document.createElement('div');
  modalContainer.classList.add('playlist-submodal-container');

  modalContainer.innerHTML = `
    <p class="playlist-submodal-title">曲を選択</p>
    <div class="playlist-form-container">
      <div id="playlist-add-select-container" class="playlist-select-container">
      </div>
    </div>
    <div class="playlist-buttons">
      <button id="playlist-add-cancel" class="playlist-btn cancel">キャンセル</button>
      <button id="playlist-add-save" class="playlist-btn save">保存</button>
    </div>
  `;

  document.getElementById('main-content').appendChild(addModal);
  addModal.appendChild(modalContainer);

  const container = document.getElementById('playlist-add-select-container');

  allMusic.forEach(music => {
    const isAlreadyIn = currentTrackIds.has(music.id);

    const item = document.createElement('div');
    item.classList.add('playlist-select-item');

    item.innerHTML = `
      <div class="playlist-select-checkbox-container">
        <input type="checkbox" class="playlist-track-checkbox" value="${music.id}" ${isAlreadyIn ? 'checked' : ''}>
      </div>
      <div class="playlist-select-item-icon-container">
        <div class="playlist-select-item-icon"></div>
      </div>
      <div class="playlist-select-item-text">
        <span class="playlist-select-item-title">${music.title}</span>
        <div class="playlist-select-item-info">
          <div class="playlist-select-item-info-left">
            <span class="playlist-select-item-artist">${music.artist}</span>
          </div>
        </div>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const checkbox = item.querySelector('.playlist-track-checkbox');
      checkbox.checked = !checkbox.checked;
    });

    container.appendChild(item);
  });

  const removeAddModal = () => addModal.remove();

  document.getElementById('playlist-add-cancel').addEventListener('click', removeAddModal);
  addModal.addEventListener('click', (e) => {
    if (e.target === addModal) removeAddModal();
  });

  document.getElementById('playlist-add-save').addEventListener('click', async () => {
    const checkboxes = container.querySelectorAll('.playlist-track-checkbox:checked');
    const selectedTrackIds = Array.from(checkboxes).map(cb => cb.value);
    const selectedTrackIdsSet = new Set(selectedTrackIds);

    // 追加と削除
    // これ再生中のリストはこのままだけど別にいいよね？
    const toAdd = selectedTrackIds.filter(id => !currentTrackIds.has(id));
    const toRemove = Array.from(currentTrackIds).filter(id => !selectedTrackIdsSet.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      removeAddModal();
      return;
    }

    try {
      const promises = [];
      // 追加
      toAdd.forEach(trackId => {
        promises.push(window.playlist.addTrack(playlistId, trackId));
      });
      // 削除
      toRemove.forEach(trackId => {
        promises.push(window.playlist.removeTrack(playlistId, trackId));
      });

      await Promise.all(promises);

      removeAddModal();
      if (onComplete) onComplete();

    } catch (error) {
      console.error('エラーが発生しました: ' + error);
      window.message.showMessage('保存中にエラーが発生しました', false);
    }
  });
}

import { musicPlayer } from './modules/music';

function playMusic(musicItem, playlist) {
  musicPlayer.play(musicItem.path, {
    id: musicItem.id,
    title: musicItem.title,
    artist: musicItem.artist,
    duration: musicItem.duration
  }, playlist);
  console.log(`Playing: ${musicItem.path}`);
}