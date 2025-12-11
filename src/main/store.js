// src/main/store.js
import Store from 'electron-store';
import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { readFile } from 'fs/promises';
import * as mm from 'music-metadata';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { app } from 'electron';
import os from 'os';
import NodeID3 from 'node-id3';

let ffmpegPath = ffmpegStatic;
// ビルド後
if (app.isPackaged) {
  ffmpegPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
}

// fluent-ffmpeg に正しいパスをセット
ffmpeg.setFfmpegPath(ffmpegPath);

const settingsSchema = {
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
  },
  'window-size': {
    type: 'object',
    default: {
      isNeedRememberWindowSize: false,
      width: 800,
      height: 500,
    },
    properties: {
      isNeedRememberWindowSize: { type: 'boolean' },
      width: { type: 'number' },
      height: { type: 'number' }
    }
  },
  'reccomended': {
    type: 'object',
    default: {
      isNeedRecommend: true,
      recommendDays: 7
    },
    properties: {
      isNeedRecommend: { type: 'boolean' },
      recommendDays: { type: 'number' }
    }
  },
  'normalize-music-volume': {
    type: 'boolean',
    default: true
  },
  'music-volume': {
    type: 'number',
    default: 100
  }
};

const store = new Store({ name: 'settings', schema: settingsSchema });
const tracksStore = new Store({ name: 'tracks' }); // 全曲のデータ
const historyStore = new Store({ name: 'history' }); // 再生履歴
const playlistsStore = new Store({ name: 'playlists' }); // プレイリスト

function analyzeLoudness(filePath) {
  return new Promise((resolve) => {
    // WindowsはNUL、その他は/dev/null
    const nullDevice = os.platform() === 'win32' ? 'NUL' : '/dev/null';
    let logData = '';

    ffmpeg(filePath)
      .audioFilters('ebur128=peak=none')
      .format('null')
      .output(nullDevice)
      .on('stderr', (stderrLine) => {
        logData += stderrLine;
      })
      .on('end', () => {
        // "I: ... LUFS"の最後のものを採用
        const regex = /I:\s+(-?\d+(?:\.\d+)?)\s+LUFS/g;
        const matches = [...logData.matchAll(regex)];

        if (matches.length > 0) {
          // 配列の最後を取得
          const lastMatch = matches[matches.length - 1];
          const lufs = parseFloat(lastMatch[1]);
          resolve(lufs);
        } else {
          console.warn('Loudness analysis failed to find value, using default.');
          resolve(-14.0); // デフォルト値
        }
      })
      .on('error', (err) => {
        console.error('Error analyzing loudness:', err);
        resolve(-14.0); // デフォルト値
      })
      .run();
  });
}

// タグサイズを推定する関数
function estimateTagSize(buffer) {
  // ID3v2タグの場合、先頭10バイトでサイズが分かる
  if (buffer.length > 10 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    // ID3v2ヘッダーのサイズフィールド（バイト6-9）
    const size = ((buffer[6] & 0x7f) << 21) |
                 ((buffer[7] & 0x7f) << 14) |
                 ((buffer[8] & 0x7f) << 7) |
                 (buffer[9] & 0x7f);
    return size + 10; // ヘッダー10バイト + タグサイズ
  }
  return 0;
}

// ファイルハッシュを生成（メタデータを除外）
async function generateFileHash(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    const fileBuffer = await readFile(filePath);

    // ID3タグなどのメタデータ領域を除外
    const format = metadata.format;
    const tagSize = format.tagTypes?.length > 0 ? estimateTagSize(fileBuffer) : 0;

    // 音声データ部分のみを抽出
    const audioData = fileBuffer.slice(tagSize);

    // ハッシュ生成
    const hash = createHash('sha256');
    hash.update(audioData);
    return hash.digest('hex');
  } catch (error) {
    console.error('Error generating file hash:', error);
    // フォールバック: ファイル全体のハッシュ
    const fileBuffer = await readFile(filePath);
    const hash = createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }
}

// ハッシュからトラックIDを検索
function findTrackByHash(fileHash) {
  const allTracks = tracksStore.store || {};
  return Object.values(allTracks).find(track => track.fileHash === fileHash);
}

// UUIDからトラックを取得
function getTrackById(trackId) {
  return tracksStore.get(trackId);
}

// トラックを保存/更新
function saveTrack(trackData) {
  tracksStore.set(trackData.id, trackData);
}

// main.js で呼び出すためのセットアップ関数
export function setupStoreIPC() {
  // settings
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

        // ファイルハッシュを生成
        const fileHash = await generateFileHash(srcPath);

        // 既存のトラックを検索
        let existingTrack = findTrackByHash(fileHash);

        if (existingTrack) {
          // 同じ音声データが既に存在
          results.push({
            success: false,
            status: 'duplicate',
            file: fileName,
            trackId: existingTrack.id
          });
          continue;
        }

        if (fs.existsSync(destPath)) {
          // ファイル名が同じだが、異なる音声データ
          // ファイル名に番号を追加
          const ext = path.extname(fileName);
          const baseName = path.basename(fileName, ext);
          let counter = 1;
          let newDestPath = destPath;

          while (fs.existsSync(newDestPath)) {
            newDestPath = path.join(musicDir, `${baseName}_${counter}${ext}`);
            counter++;
          }

          await fs.promises.copyFile(srcPath, newDestPath);

          // メタデータを取得してトラックを作成
          const metadata = await mm.parseFile(newDestPath);
          const lufs = await analyzeLoudness(newDestPath);
          const trackId = uuidv4();
          const trackData = {
            id: trackId,
            fileHash: fileHash,
            fileName: path.basename(newDestPath),
            metadata: {
              title: metadata.common.title || path.parse(newDestPath).name,
              artist: metadata.common.artist || 'Unknown Artist',
              duration: metadata.format.duration || 0,
              volume: lufs
            },
            tags: [],
            addedAt: Date.now()
          };

          saveTrack(trackData);
          results.push({ success: true, file: fileName, trackId: trackId });
          continue;
        }

        await fs.promises.copyFile(srcPath, destPath);
        const lufs = await analyzeLoudness(destPath);
        // メタデータを取得してトラックを作成
        const metadata = await mm.parseFile(destPath);
        const trackId = uuidv4();
        const trackData = {
          id: trackId,
          fileHash: fileHash,
          fileName: fileName,
          metadata: {
            title: metadata.common.title || path.parse(fileName).name,
            artist: metadata.common.artist || 'Unknown Artist',
            duration: metadata.format.duration || 0,
            volume: lufs
          },
          tags: [],
          addedAt: Date.now()
        };

        saveTrack(trackData);
        results.push({ success: true, file: fileName, trackId: trackId });
      } catch (error) {
        results.push({ success: false, file: srcPath, error: error.message });
      }
    }
    return results;
  });

  // 曲を削除
  ipcMain.handle('music:delete', async (_event, trackId) => {
    try {
      const track = getTrackById(trackId);
      if (!track) {
        return { success: false, error: 'Track not found' };
      }

      // mp3ファイルを削除
      const filePath = path.join(musicDir, track.fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }

      // tracksStoreからデータを削除
      tracksStore.delete(trackId);

      // historyStoreの曲idに一致する履歴をすべて削除
      const history = historyStore.get('playHistory') || [];
      const newHistory = history.filter(h => h.trackId !== trackId);
      historyStore.set('playHistory', newHistory);

      // playlistsStoreのtrackIdsから曲idに一致するものを削除
      const allPlaylists = playlistsStore.store || {};
      for (const [playlistId, playlist] of Object.entries(allPlaylists)) {
        if (playlist.trackIds && playlist.trackIds.includes(trackId)) {
          playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
          playlistsStore.set(playlistId, playlist);
        }
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting track:', error);
      return { success: false, error: error.message };
    }
  });

  // すべての音楽を取得
  ipcMain.handle('music:get-all-music', async () => {
    try {
      const allTracks = tracksStore.store || {};
      const trackList = [];

      for (const track of Object.values(allTracks)) {
        const filePath = path.join(musicDir, track.fileName);

        // ファイルが存在するか確認
        if (fs.existsSync(filePath)) {
          trackList.push({
            id: track.id,
            fileName: track.fileName,
            path: filePath,
            title: track.metadata.title,
            artist: track.metadata.artist,
            duration: track.metadata.duration,
            volume: track.metadata.volume,
            tags: track.tags || [],
            addedAt: track.addedAt
          });
        }
      }

      return trackList;
    } catch (error) {
      console.error('Error getting music list:', error);
      return [];
    }
  });

  ipcMain.handle('music:get-by-artist', async (_event, artistName) => {
    try {
      const allTracks = tracksStore.store || {};
      const trackList = [];

      for (const track of Object.values(allTracks)) {
        // 一致するものだけを抽出
        if (track.metadata && track.metadata.artist === artistName) {
          const filePath = path.join(musicDir, track.fileName);

          // ファイルが存在するか確認
          if (fs.existsSync(filePath)) {
            trackList.push({
              id: track.id,
              fileName: track.fileName,
              path: filePath,
              title: track.metadata.title,
              artist: track.metadata.artist,
              duration: track.metadata.duration,
              volume: track.metadata.volume,
              tags: track.tags || [],
              addedAt: track.addedAt
            });
          }
        }
      }

      return trackList;
    } catch (error) {
      console.error('Error getting music by artist:', error);
      return [];
    }
  });

  // トラックのメタデータを更新
  ipcMain.handle('music:update-metadata', async (_event, trackId, newMetadata) => {
    try {
      const track = getTrackById(trackId);
      if (!track) {
        return { success: false, error: 'Track not found' };
      }

      // track.jsonのメタデータを更新
      track.metadata = { ...track.metadata, ...newMetadata };
      saveTrack(track);

      // ID3も変更
      const filePath = path.join(musicDir, track.fileName);
      const tags = {};
      if (newMetadata.title) tags.title = newMetadata.title;
      if (newMetadata.artist) tags.artist = newMetadata.artist;
      await NodeID3.Promise.update(tags, filePath);
        

      return { success: true, track };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // トラックのファイル名を更新
  ipcMain.handle('music:update-filename', async (_event, trackId, newFileName) => {
    try {
      const track = getTrackById(trackId);
      if (!track) {
        return { success: false, error: 'Track not found' };
      }

      const oldPath = path.join(musicDir, track.fileName);
      const newPath = path.join(musicDir, newFileName);

      // 変更後のファイル名が既に存在
      if (track.fileName !== newFileName && fs.existsSync(newPath)) {
        return { success: false, error: 'File name already exists' };
      }

      // ファイル名を変更
      await fs.promises.rename(oldPath, newPath);
      track.fileName = newFileName;

      // タイトルも変更
      const ext = path.extname(newFileName);
      const baseName = path.basename(newFileName, ext);
      track.metadata.title = baseName;

      // ID3も変更
      const tags = {
        title: baseName
      };
      await NodeID3.Promise.update(tags, newPath);

      saveTrack(track);

      return { success: true, track };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // トラックのタグを更新
  ipcMain.handle('music:update-tags', (_event, trackId, newTagsArray) => {
    try {
      const track = getTrackById(trackId);
      if (!track) {
        return { success: false, error: 'Track not found' };
      }

      // 配列で上書き保存
      track.tags = newTagsArray;
      saveTrack(track);

      return { success: true, track };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // タグでフィルタリング（AND/OR/除外条件）
  ipcMain.handle('music:filter-by-tags', (_event, options) => {
    try {
      const { tags = [], excludeTags = [], requirement = 'AND' } = options;
      const allTracks = tracksStore.store || {};

      const filtered = Object.values(allTracks).filter(track => {
        const trackTags = track.tags || [];

        if (excludeTags.length > 0 && excludeTags.some(tag => trackTags.includes(tag))) {
          return false;
        }
        if (tags.length === 0) {
          return true;
        }

        // 検索条件
        if (requirement === 'AND') {
          if (!tags.every(tag => trackTags.includes(tag))) {
            return false;
          }
        } else if (requirement === 'OR') {
          if (!tags.some(tag => trackTags.includes(tag))) {
            return false;
          }
        }
        return true;
      });

      return filtered.map(track => ({
        id: track.id,
        fileName: track.fileName,
        path: path.join(musicDir, track.fileName),
        title: track.metadata.title,
        artist: track.metadata.artist,
        duration: track.metadata.duration,
        volume: track.metadata.volume,
        tags: track.tags || []
      }));
    } catch (error) {
      console.error('Error filtering by tags:', error);
      return [];
    }
  });

  // 再生履歴を追加
  ipcMain.handle('music:add-history', (_event, trackId) => {
    try {
      const history = historyStore.get('playHistory') || [];
      const now = Date.now();

      history.push({
        trackId: trackId,
        playedAt: now
      });

      // 30日以前の履歴を削除
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      const recentHistory = history.filter(h => h.playedAt >= thirtyDaysAgo);

      historyStore.set('playHistory', recentHistory);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 全期間の再生履歴を取得
  ipcMain.handle('music:get-history', (_event) => {
    try {
      const history = historyStore.get('playHistory') || [];
      return history;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  });

  // プレイリストを作成
  ipcMain.handle('playlist:create', (_event, name) => {
    try {
      const playlistId = uuidv4();
      const playlist = {
        id: playlistId,
        name: name,
        trackIds: [],
        createdAt: Date.now()
      };

      playlistsStore.set(playlistId, playlist);
      return { success: true, playlist };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // プレイリストにトラックを追加
  ipcMain.handle('playlist:add-track', (_event, playlistId, trackId) => {
    try {
      const playlist = playlistsStore.get(playlistId);
      if (!playlist) {
        return { success: false, error: 'Playlist not found' };
      }

      if (!playlist.trackIds.includes(trackId)) {
        playlist.trackIds.push(trackId);
        playlistsStore.set(playlistId, playlist);
      }

      return { success: true, playlist };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // プレイリストからトラックを削除
  ipcMain.handle('playlist:remove-track', (_event, playlistId, trackId) => {
    try {
      const playlist = playlistsStore.get(playlistId);
      if (!playlist) {
        return { success: false, error: 'Playlist not found' };
      }

      playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
      playlistsStore.set(playlistId, playlist);

      return { success: true, playlist };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // すべてのプレイリストを取得
  ipcMain.handle('playlist:get-all', () => {
    try {
      return Object.values(playlistsStore.store || {});
    } catch (error) {
      console.error('Error getting playlists:', error);
      return [];
    }
  });

  // 特定のプレイリストを取得
  ipcMain.handle('playlist:get', (_event, playlistId) => {
    try {
      const playlist = playlistsStore.get(playlistId);
      if (!playlist) return { success: false, error: 'Playlist not found' };
      return playlist;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // プレイリスト名を変更
  ipcMain.handle('playlist:change-name', (_event, playlistId, newName) => {
    try {
      const playlist = playlistsStore.get(playlistId);
      if (!playlist) return { success: false, error: 'Playlist not found' };
      playlist.name = newName;
      playlistsStore.set(playlistId, playlist);
      return { success: true, playlist };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // プレイリストを削除
  ipcMain.handle('playlist:delete', (_event, playlistId) => {
    try {
      playlistsStore.delete(playlistId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

export default store;