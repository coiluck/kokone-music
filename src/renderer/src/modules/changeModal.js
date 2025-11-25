// src/renderer/src/modules/changeModal.js
let isChanging = false;

export function changeModal(modalName, scrollContainer, duration = 500, isFlex = false) {
  if (isChanging) {
    return;
  }

  const targetItem = document.getElementById(modalName);
  const targetIcon = targetItem.querySelector('.left-panel-item-icon');

  if (targetIcon && targetIcon.classList.contains('active')) {
    return;
  }

  isChanging = true;

  document.querySelectorAll('.left-panel-item-icon.active').forEach(function(icon) {
    icon.classList.remove('active');
  });
  if (targetIcon) {
    targetIcon.classList.add('active');
  }
  // すべてのモーダルを閉じる
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.classList.remove('fade-in');
    modal.classList.add('fade-out');
  });

  setTimeout(function() {
    // targetモーダルを表示
    document.querySelectorAll('.modal').forEach(function(modal) {
      modal.style.display = 'none';
    });
    
    const targetModal = document.getElementById(`modal-${modalName}`);
    if (targetModal) {
      targetModal.classList.remove('fade-out');
      if (isFlex) {
        targetModal.style.display = 'flex';
      } else {
        targetModal.style.display = 'block';
      }
      targetModal.classList.add('fade-in');
    }

    // スクロールをリセット
    if (scrollContainer) {
      const container = document.querySelector(`${scrollContainer}`);
      if (container) container.scrollTop = 0;
    }
  }, duration);

  setTimeout(function() {
    isChanging = false;
  }, duration);
}