// src/renderer/src/renderer.js
import { changeModal } from './modules/changeModal.js';

window.addEventListener('DOMContentLoaded', () => {
  // 初期modal
  changeModal('home');
  document.getElementById('home').querySelector('.left-panel-item-icon').classList.add('active');
  // modal切り替え
  document.querySelectorAll('.left-panel-item').forEach(function(item) {
    item.addEventListener('click', function() {
      if (item.querySelector('.left-panel-item-icon').classList.contains('active')) {
        return;
      }
      document.querySelectorAll('.left-panel-item-icon.active').forEach(function(item) {
        item.classList.remove('active');
      });
      item.querySelector('.left-panel-item-icon').classList.add('active');
      changeModal(item.id);
    });
  });
})
