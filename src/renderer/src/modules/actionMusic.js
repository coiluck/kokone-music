// src/renderer/src/modules/actionMusic.js
export function showActionMenu(event, music) {
  closeActionMenu();
  
  const menu = document.createElement('div');
  menu.classList.add('action-menu');
  
  // クリック位置に合わせて配置
  const rect = event.target.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

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
  document.body.appendChild(menu);

  // イベントリスナー
  document.getElementById('action-edit').addEventListener('click', (e) => {
      // 画面を開く処理
      // 後で書く
    closeActionMenu();
  });
  document.getElementById('action-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    const confirmDelete = confirm(`"${music.title}" を削除しますか？`);
    if (confirmDelete) {
      // 消す処理
      // 後で書く
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