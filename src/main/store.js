// src/main/store.js
import Store from 'electron-store';
import { ipcMain } from 'electron';

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
}

export default store;