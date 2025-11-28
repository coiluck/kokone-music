// src/main/store.js
import Store from 'electron-store';
import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import * as mm from 'music-metadata';

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

        if (fs.existsSync(destPath)) {
          // 存在する場合
          results.push({
            success: false,
            status: 'exists',
            file: fileName
          });
          continue;
        }

        await fs.promises.copyFile(srcPath, destPath);
        results.push({ success: true, file: fileName });
      } catch (error) {
        results.push({ success: false, file: srcPath, error: error.message });
      }
    }
    return results;
  });


  ipcMain.handle('music:get-all-music', async () => {
    try {
      const files = fs.readdirSync(musicDir);

      const musicList = await Promise.all(
        files
          .filter(file => file.toLowerCase().endsWith('.mp3'))
          .map(async (file) => {
            const filePath = path.join(musicDir, file);

            try {
              const metadata = await mm.parseFile(filePath);

              return {
                fileName: file,
                path: filePath,
                title: metadata.common.title || file,
                artist: metadata.common.artist || 'Unknown Artist',
                duration: metadata.format.duration || 0 // seconds
              };
            } catch (e) {
              console.error(`Failed to parse ${file}:`, e);
              return {
                fileName: file,
                path: filePath,
                title: file,
                artist: 'Unknown',
                duration: 0
              };
            }
          })
      );

      return musicList;

    } catch (error) {
      console.error('Error getting music list:', error);
      return [];
    }
  });
}

export default store;