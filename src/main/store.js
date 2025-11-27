// src/main/store.js
import Store from 'electron-store';
import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

const schema = {
  'font': {
    type: 'string',
    default: '"Noto Sans JP", sans-serif'
  },
  'colors': {
    type: 'object',
    default: {
      accent: '#ff7f7e',
      text:   '#fff3f1',
      bg:     '#0a0f1e'
    },
    properties: {
      accent: { type: 'string' },
      text:   { type: 'string' },
      bg:     { type: 'string' }
    }
  },
  'icon-style': {
    type: 'string',
    default: 'fill'
  }
};

const store = new Store({ schema });

// main.js で呼び出すためのセットアップ関数
export function setupStoreIPC() {
  ipcMain.handle('settings:get', (_event, key) => {
    return store.get(key);
  });

  ipcMain.handle('settings:set', (_event, key, value) => {
    store.set(key, value);
    return true;
  });

  // electron-storeのconfigファイルがあるフォルダを取得
  const userDataPath = path.dirname(store.path);
  // その中のmusicフォルダ
  const musicDir = path.join(userDataPath, 'music');

  if (!fs.existsSync(musicDir)) {
    fs.mkdirSync(musicDir, { recursive: true });
  }

  ipcMain.handle('music:get-path', () => {
    return musicDir;
  });

  // ファイルを保存
  ipcMain.handle('music:save-files', async (_event, filePaths) => {
    const results = [];
    for (const srcPath of filePaths) {
      try {
        const fileName = path.basename(srcPath);
        const destPath = path.join(musicDir, fileName);

        await fs.promises.copyFile(srcPath, destPath);
        results.push({ success: true, file: fileName });
        console.log(`Saved: ${fileName}`);
      } catch (error) {
        console.error(`Failed to save ${srcPath}:`, error);
        results.push({ success: false, file: srcPath, error: error.message });
      }
    }
    return results;
  });
}

export default store;