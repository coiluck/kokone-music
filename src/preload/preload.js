// src/preload/preload.js
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    // dataの読み書き
    contextBridge.exposeInMainWorld('settings', {
      get: (key) => ipcRenderer.invoke('settings:get', key),
      set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
    });
    // 曲ファイルの保存
    contextBridge.exposeInMainWorld('music', {
      saveFiles: (filePaths) => ipcRenderer.invoke('music:save-files', filePaths),
      getPath: (file) => webUtils.getPathForFile(file)
    });
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
