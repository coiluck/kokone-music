// src/renderer/src/modules/actionMusic.js
import { musicPlayer } from './music.js';
import { setupHome } from '../home.js';
import { setupPlaylist } from '../playlist.js';
import { setupArtist } from '../artist.js';
import { setupTags } from '../tags.js';

export function showActionMenu(event, music) {
  closeActionMenu();

  const menu = document.createElement('div');
  menu.classList.add('action-menu');

  const rect = event.target.getBoundingClientRect();
  const scrollContainer = event.target.closest('.modal, .artist-submodal-container');
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    menu.style.top = `${rect.bottom - containerRect.top + scrollContainer.scrollTop}px`;
    menu.style.right = `${containerRect.right - rect.right}px`;
    scrollContainer.appendChild(menu);
  } else {
    // modal外
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    document.body.appendChild(menu);
  }

  menu.innerHTML = `
    <div class="action-menu-item" id="action-edit">
      <div class="action-music-icon" id="action-music-edit-icon"></div>
      <span>情報を編集</span>
    </div>
    <div class="action-menu-item delete" id="action-delete">
      <div class="action-music-icon" id="action-music-delete-icon"></div>
      <span>Delete</span>
    </div>
  `;
  // イベントリスナー
  document.getElementById('action-edit').addEventListener('click', (e) => {
    openEditModal(music); // 画面を開く
    closeActionMenu();
  });
  document.getElementById('action-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    const confirmDelete = await window.message.showMessage(`"${music.title}" を削除しますか？`, true);
    if (confirmDelete) {
      // 消す処理
      try {
        const result = await window.music.delete(music.id);
        if (result.success) {
          musicPlayer.removeTrackFromPlaylist(music.id);
          // 表示を更新
          // home, playlist, artist, tagのすべてのsetUpを走らせる
          setupHome();
          setupPlaylist();
          setupArtist();
          setupTags();
        } else {
          window.message.showMessage(`削除に失敗しました: ${result.error}`, false);
        }
      } catch (err) {
        console.error(err);
      }
    }
    closeActionMenu();
  });
}

export function closeActionMenu() {
  const existingMenu = document.querySelector('.action-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
}



function openEditModal(music) {
  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay';

  const currentTags = Array.isArray(music.tags) ? music.tags.join(',') : ''; // 文字列
  const currentTitle = music.metadata?.title || music.title || '';
  const currentArtist = music.metadata?.artist || music.artist || '';

  overlay.innerHTML = `
    <div class="edit-container">
      <p class="edit-title">情報を編集</p>

      <div class="edit-form-container">
        <div class="edit-form-item">
          <label for="edit-filename">ファイル名</label>
          <input type="text" id="edit-filename" class="edit-input" value="${currentTitle}" spellcheck="false">
        </div>
        <div class="edit-form-item">
          <label for="edit-artist">Artist</label>
          <input type="text" id="edit-artist" class="edit-input" value="${currentArtist || ''}" spellcheck="false">
        </div>
        <div class="edit-form-item">
          <label for="edit-tags">Tags (カンマ区切り)</label>
          <input type="text" id="edit-tags" class="edit-input" value="${currentTags}" placeholder="例: Pop, Kawaii Future Bass, Piano" spellcheck="false">
        </div>
      </div>

      <div class="edit-buttons">
        <button id="edit-btn-cancel" class="edit-btn cancel">キャンセル</button>
        <button id="edit-btn-save" class="edit-btn save">保存</button>
      </div>
    </div>
  `;

  document.getElementById('main-content').appendChild(overlay);

  // イベントリスナー
  // キャンセルボタン
  document.getElementById('edit-btn-cancel').addEventListener('click', () => {
    closeEditModal();
  });
  // 背景クリック
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeEditModal();
    }
  });
  // 保存ボタン
  document.getElementById('edit-btn-save').addEventListener('click', async () => {
    const newTitle = document.getElementById('edit-filename').value.trim();
    let newArtist = document.getElementById('edit-artist').value.trim();
    const tagsString = document.getElementById('edit-tags').value;

    if (!newTitle) {
      await window.message.showMessage('タイトルは必須です', false);
      return;
    }
    if (!newArtist) {
      newArtist = 'Unknown Artist';
    }
    // タグを配列に変換
    const newTags = tagsString.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      const promises = [];

      // ファイル名の更新
      if (newTitle !== currentTitle) {
        const originalFileName = music.fileName;
        const extIndex = originalFileName.lastIndexOf('.'); // 拡張子
        const extension = extIndex !== -1 ? originalFileName.substring(extIndex) : '';

        const newFileName = newTitle + extension;

        promises.push(window.music.updateFilename(music.id, newFileName));
      }

      // Artistの更新
      if (newArtist !== currentArtist) {
        promises.push(window.music.updateMetadata(music.id, { artist: newArtist }));
      }

      // タグの更新
      promises.push(window.music.updateTags(music.id, newTags));

      // 全ての処理を待機
      const results = await Promise.all(promises);

      // エラーチェック
      const errorResult = results.find(r => r && !r.success);
      if (errorResult) {
        window.message.showMessage(`保存に失敗しました: ${errorResult.error}`, false);
        return;
      }

      // 成功時の処理
      closeEditModal();
      // home, playlist, artist, tagのすべてのsetUpを走らせる
      setupHome();
      setupPlaylist();
      setupArtist();
      setupTags();
    } catch (err) {
      console.error(err);
    }
  });
}

export function closeEditModal() {
  // 基本は上のopenEditModal関数内のイベントリスナでいいけど
  // .left-panelの中をクリックしてもとじないのが気になるからchangeModal内に書いておく
  const overlay = document.getElementById('edit-overlay');
  if (overlay) {
    overlay.remove();
  }
}