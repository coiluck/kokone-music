// src/preload/preload.js
import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('music', {
  // 音楽ファイルデータ
  getPath: () => ipcRenderer.invoke('music:get-path'),
  getFilePath: (file) => webUtils.getPathForFile(file),
  saveFiles: (filePaths) => ipcRenderer.invoke('music:save-files', filePaths),
  getAllMusic: () => ipcRenderer.invoke('music:get-all-music'),

  // 編集
  updateMetadata: (trackId, newMetadata) =>
    ipcRenderer.invoke('music:update-metadata', trackId, newMetadata),
  updateFilename: (trackId, newFileName) =>
    ipcRenderer.invoke('music:update-filename', trackId, newFileName),
  updateTags: (trackId, newTags) =>
    ipcRenderer.invoke('music:update-tags', trackId, newTags),

  filterByTags: (options) =>
    ipcRenderer.invoke('music:filter-by-tags', options),
  getByArtist: (artistName) =>
    ipcRenderer.invoke('music:get-by-artist', artistName),

  // 履歴
  addHistory: (trackId) =>
    ipcRenderer.invoke('music:add-history', trackId),
  getHistory: () =>
    ipcRenderer.invoke('music:get-history'),
});

contextBridge.exposeInMainWorld('playlist', {
  create: (name) => ipcRenderer.invoke('playlist:create', name),
  addTrack: (playlistId, trackId) =>
    ipcRenderer.invoke('playlist:add-track', playlistId, trackId),
  removeTrack: (playlistId, trackId) =>
    ipcRenderer.invoke('playlist:remove-track', playlistId, trackId),
  getAll: () => ipcRenderer.invoke('playlist:get-all'),
  get: (playlistId) => ipcRenderer.invoke('playlist:get', playlistId),
  changeName: (playlistId, name) => ipcRenderer.invoke('playlist:change-name', playlistId, name),
  delete: (playlistId) => ipcRenderer.invoke('playlist:delete', playlistId),
});

contextBridge.exposeInMainWorld('settings', {
  get: (key) => ipcRenderer.invoke('settings:get', key),
  set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
});

contextBridge.exposeInMainWorld('openUserDataFolder', {
  open: () => ipcRenderer.invoke('open-userdata-folder')
});