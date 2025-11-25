// src/renderer/src/modules/changeModal.js
let isChanging = false;

export function changeModal(modalName, scrollContainer, duration = 500, isFlex = false) {
  if (isChanging) {
    return;
  }
  isChanging = true;
  // すべてのモーダルを閉じる
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.classList.remove('fade-in');
    modal.classList.add('fade-out')
  });
  setTimeout(function() {
    // targetモーダルを表示
    document.querySelectorAll('.modal').forEach(function(modal) {
      modal.style.display = 'none';
    });
    document.getElementById(`modal-${modalName}`).classList.remove('fade-out');
    if (isFlex) {
      document.getElementById(`modal-${modalName}`).style.display = 'flex';
    } else {
      document.getElementById(`modal-${modalName}`).style.display = 'block';
    }
    // スクロールをリセット
    if (scrollContainer) {
      document.querySelector(`${scrollContainer}`).scrollTop = 0;
    }
    document.getElementById(`modal-${modalName}`).classList.add('fade-in');
  }, duration);
  setTimeout(function() {
    isChanging = false;
  }, duration);
}