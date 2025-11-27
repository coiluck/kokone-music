// src/renderer/src/renderer.js
import { changeModal } from './modules/changeModal.js';
import { applySettings } from './settings.js'
import { setupAddMusic } from './addMusic.js'

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
});