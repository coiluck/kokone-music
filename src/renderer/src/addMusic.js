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
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFiles(files);
  });
}

// 追加したら反映するためのもの
import { setupHome } from './home.js'

async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const filesArray = Array.from(files);

  const mp3Files = filesArray.filter(file => {
    return file.name.toLowerCase().endsWith('.mp3');
  });
  const invalidFiles = filesArray.filter(file => {
    return !file.name.toLowerCase().endsWith('.mp3');
  });

  if (mp3Files.length === 0 && invalidFiles.length > 0) {
    alert('MP3ファイル以外はサポートされていません');
    return;
  }

  const filePaths = mp3Files.map(file => {
    return window.music.getFilePath(file);
  });

  try {
    const results = await window.music.saveFiles(filePaths);

    // 結果の集計
    const successItems = results.filter(r => r.success);
    const existItems = results.filter(r => !r.success && r.status === 'duplicate');
    const errorItems = results.filter(r => !r.success && r.status !== 'duplicate');

    let message = '';

    if (successItems.length > 0) {
      message += `追加しました: ${successItems.length} 曲\n`;
    }

    if (existItems.length > 0) {
      if (message) message += '\n';
      message += `既に存在するためスキップしました: 以下の ${existItems.length} 曲\n`;
      existItems.forEach(item => {
        message += `・${item.file}\n`;
      });
    }

    if (invalidFiles.length > 0) {
      if (message) message += '\n';
      message += `MP3ファイル以外の拡張子のためスキップしました: 以下の ${invalidFiles.length} 件\n`;
      invalidFiles.forEach(item => {
        message += `・${item.name}\n`;
      });
    }

    if (errorItems.length > 0) {
      if (message) message += '\n';
      message += `エラーが発生: ${errorItems.length} 件`;
      console.error('エラー詳細:', errorItems);
    }

    alert(message);
    // DOM更新
    setupHome();
  } catch (error) {
    console.error('詳細なエラー:', error);
    alert('ファイルの保存に失敗しました。');
  }
}