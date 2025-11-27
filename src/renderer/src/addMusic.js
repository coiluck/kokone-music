// src/renderer/src/addMusic.js
export function setupAddMusic() {
  const dropZone = document.getElementById('add-music-drop');
  const selectButton = document.getElementById('add-music-select-button');

  if (!dropZone || !selectButton) return;

  // 隠しファイル入力要素を作成（ボタンクリック用）
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.accept = 'audio/*'; // 音声ファイルのみ許可
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  selectButton.addEventListener('click', () => {
    fileInput.click();
  });

  // 2. ファイルが選択された時の処理
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // ドロップされた時の処理
  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  });
}

async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const filePaths = Array.from(files).map(file => {
    // webUtils経由でパスを取得
    return window.music.getPath(file);
  });

  try {
    // preload.js で定義した music.saveFiles を呼び出し
    const results = await window.music.saveFiles(filePaths);

    // 結果の集計
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      alert(`${successCount} 曲を追加しました！`);
    }

    if (failCount > 0) {
      console.error(`${failCount} 件の追加に失敗しました`);
    }

  } catch (error) {
    console.error('詳細なエラー:', error);
    alert('ファイルの保存に失敗しました。');
  }
}