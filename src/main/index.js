// src/main/index.js
import { app, shell, BrowserWindow, ipcMain, protocol, dialog } from 'electron'
import { join, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import store, { setupStoreIPC } from './store.js'
import { readFile } from 'fs/promises'
const path = require('path');
const fs = require('fs');

function createWindow() {
  const windowSettings = store.get('window-size');
  const shouldRemember = windowSettings && windowSettings.isNeedRememberWindowSize;

  const initWidth = (shouldRemember && windowSettings.width) ? windowSettings.width : 800;
  const initHeight = (shouldRemember && windowSettings.height) ? windowSettings.height : 500;

  const mainWindow = new BrowserWindow({
    width: initWidth,
    height: initHeight,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', async (e) => {
    e.preventDefault(); // 一旦閉じるのをキャンセル
    try {
      // DOMの状態を確認
      const isChecked = await mainWindow.webContents.executeJavaScript(`
        (function() {
          const el = document.getElementById('setting-is-need-remember-window-size');
          return el ? el.checked : false;
        })()
      `).catch(() => false);

      const currentBounds = mainWindow.getBounds();
      const currentSettings = store.get('window-size') || {};

      // 保存するオブジェクトを作成
      const newSettings = {
        isNeedRememberWindowSize: isChecked,
        width: isChecked ? currentBounds.width : (currentSettings.width || 800),
        height: isChecked ? currentBounds.height : (currentSettings.height || 500)
      };

      store.set('window-size', newSettings);

    } catch (err) {
      console.error('Error saving window settings:', err);
    } finally {
      // 処理が終わったらウィンドウを閉じる
      mainWindow.removeAllListeners('close');
      mainWindow.close();
    }
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      standard: true
    }
  }
])



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  setupStoreIPC()

  ipcMain.handle('open-userdata-folder', async () => {
    const musicFolderPath = path.join(app.getPath('userData'), 'music'); // AppData/Roaming/kokone-music/music
    if (!fs.existsSync(musicFolderPath)) {
      fs.mkdirSync(musicFolderPath);
    }
    const result = await shell.openPath(musicFolderPath);
    return result;
  });


  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  protocol.handle('media', async (request) => {
    try {
      const urlObj = new URL(request.url);
      const decodedPath = urlObj.searchParams.get('path');

      if (!decodedPath) {
        return new Response('Path not found', { status: 400 });
      }

      // ファイルを読み込む
      const data = await readFile(decodedPath);

      const ext = extname(decodedPath).toLowerCase();
      let mimeType = 'application/octet-stream';

      if (ext === '.mp3') mimeType = 'audio/mpeg';
      else if (ext === '.wav') mimeType = 'audio/wav';
      else if (ext === '.ogg') mimeType = 'audio/ogg';
      else if (ext === '.m4a') mimeType = 'audio/mp4';

      const range = request.headers.get('Range');

      if (range) {
        // Rangeヘッダーがある場合 (例: bytes=32768-)
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        // endが指定されていない場合はファイルの最後とする
        const end = parts[1] ? parseInt(parts[1], 10) : data.length - 1;

        // 要求された範囲のデータを切り出す
        const chunksize = (end - start) + 1;
        const chunk = data.subarray(start, end + 1);

        return new Response(chunk, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Range': `bytes ${start}-${end}/${data.length}`
          }
        });
      } else {
        // Rangeヘッダーがない場合 (初回読み込みなど)
        return new Response(data, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Accept-Ranges': 'bytes',
            'Content-Length': data.length
          }
        });
      }
    } catch (error) {
      console.error('Media Protocol Error:', error);
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle('showMessage', async (event, message, isNeedTwoButtons = false) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  
  // ボタンの定義
  const buttons = isNeedTwoButtons ? ['OK', 'キャンセル'] : ['OK'];
  
  const result = await dialog.showMessageBox(win, {
    type: 'none',
    title: 'kokone-music',
    message: message,
    buttons: buttons,
    defaultId: 0,
    cancelId: isNeedTwoButtons ? 1 : 0,
    noLink: true
  });
  if (result.response === 0) {
    return true;
  } else if (result.response === 1) {
    return false;
  } 
});