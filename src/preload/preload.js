// src/preload/preload.js
import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('music', {
  // 音楽ファイルデータ
  getPath: () => ipcRenderer.invoke('music:get-path'),
  getFilePath: (file) => webUtils.getPathForFile(file),
  saveFiles: (filePaths) => ipcRenderer.invoke('music:save-files', filePaths),
  getAllMusic: () => ipcRenderer.invoke('music:get-all-music'),

  // メタデータ
  updateMetadata: (trackId, newMetadata) =>
    ipcRenderer.invoke('music:update-metadata', trackId, newMetadata),
  updateFilename: (trackId, newFileName) =>
    ipcRenderer.invoke('music:update-filename', trackId, newFileName),

  // タグ
  addTag: (trackId, tag) =>
    ipcRenderer.invoke('music:add-tag', trackId, tag),
  removeTag: (trackId, tag) =>
    ipcRenderer.invoke('music:remove-tag', trackId, tag),
  filterByTags: (options) =>
    ipcRenderer.invoke('music:filter-by-tags', options),

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
});

contextBridge.exposeInMainWorld('settings', {
  get: (key) => ipcRenderer.invoke('settings:get', key),
  set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
});