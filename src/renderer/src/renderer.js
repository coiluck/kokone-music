// src/renderer/src/renderer.js
import { changeModal } from './modules/changeModal.js';
import { applySettings } from './settings.js'
import { setupAddMusic } from './addMusic.js'
import { setupHome } from './home.js'
import { closeActionMenu } from './modules/actionMusic.js'
import { setupTags } from './tags.js'
import { setupArtist } from './artist.js'
import { setupPlaylist } from './playlist.js'

document.addEventListener('DOMContentLoaded', () => {
  // 初期modal
  changeModal('home');
  document.getElementById('home').querySelector('.left-panel-item-icon').classList.add('active');
  // modal切り替え
  document.querySelectorAll('.left-panel-item').forEach(function(item) {
    item.addEventListener('click', function() {
      changeModal(item.id);
    });
  });
  // app version
  document.getElementById('app-version').textContent = APP_VERSION;
  // apply user settings
  applySettings();
  // add music
  setupAddMusic();
  // home
  setupHome();
  // playlist
  setupPlaylist();
  // artist
  setupArtist();
  // tags
  setupTags();
});

// 曲の編集・削除用
document.addEventListener('click', (e) => {
  closeActionMenu();
});