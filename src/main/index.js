// src/main/index.js
import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
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

  protocol.handle('media', (request) => {
    // 1. 'media://' スキームを取り除く
    // request.url が 'media:///C:/Users...' の場合、slice後は '/C:/Users...' となる
    let rawPath = request.url.slice('media://'.length);

    // 2. URLデコード
    let decodedPath = decodeURIComponent(rawPath);

    // 3. 【重要】Windows対策: パスの先頭が '/' で始まる場合、それを削除する
    // pathToFileURL は Windows の場合 'C:/Users/...' (先頭スラッシュなし) を期待します
    if (process.platform === 'win32' && decodedPath.startsWith('/')) {
      decodedPath = decodedPath.slice(1);
    }

    try {
      // 4. Node.jsのURLモジュールで絶対パスを file:// URLへ変換
      const fileUrl = pathToFileURL(decodedPath).toString();

      // 5. file:// URL を fetch する
      return net.fetch(fileUrl);
    } catch (error) {
      console.error('Media protocol error:', error);
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
