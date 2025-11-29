// src/main/index.js
import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupStoreIPC } from './store.js'
import { pathToFileURL } from 'url';

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 500,
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

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
      stream: true // メディアストリーミングに重要
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

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  protocol.handle('media', async (request) => {
    // URLのパースロジックをより安全な形に修正
    let rawPath = request.url.slice('media://'.length);
    let decodedPath = decodeURIComponent(rawPath);

    // Windowsのパス調整 (/C:/... -> C:/...)
    if (process.platform === 'win32' && decodedPath.startsWith('/') && !decodedPath.startsWith('//')) {
      decodedPath = decodedPath.slice(1);
    }

    try {
      const fileUrl = pathToFileURL(decodedPath).toString();

      // net.fetchでファイルを取得
      const response = await net.fetch(fileUrl);

      // 【追加 2】: 適切なContent-Typeを設定して新しいResponseを返す
      if (response.ok) {
        const ext = extname(decodedPath).toLowerCase();
        let mimeType = 'application/octet-stream'; // デフォルト

        if (ext === '.mp3') mimeType = 'audio/mpeg';
        else if (ext === '.wav') mimeType = 'audio/wav';
        else if (ext === '.ogg') mimeType = 'audio/ogg';
        else if (ext === '.m4a') mimeType = 'audio/mp4';

        // ヘッダーを再構築（net.fetchのレスポンスヘッダーは読み取り専用の場合があるため）
        return new Response(response.body, {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Accept-Ranges': 'bytes' // ストリーミング再生（シーク）に必要
          }
        });
      }

      return response;

    } catch (error) {
      console.error('Media Protocol Error:', error);
      return new Response('Internal Server Error', { status: 500 });
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
