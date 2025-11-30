// src/renderer/src/modules/music.js
import { setupPlayerUi, updatePlayPauseButton } from '../playerUi.js';

class MusicPlayer {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.repeatMode = 'list-order'; // 'list-order', 'repeat', 'repeat-one', 'shuffle'
  }

  play(filePath, trackInfo = {}) {
    // 既存の再生を停止
    this.stop();

    // 新しい曲情報を保存
    this.currentTrack = {
      path: filePath,
      title: trackInfo.title || 'Unknown',
      artist: trackInfo.artist || 'Unknown',
      duration: trackInfo.duration || 0
    };

    setupPlayerUi(
      this.currentTrack.title,
      this.currentTrack.artist,
      secondsToMinutes(this.currentTrack.duration)
    );

    // 新しいAudioインスタンスを作成
    const cleanPath = filePath.replace(/\\/g, '/');
    const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const fileUrl = 'media:///' + encodedPath;

    this.audio = new Audio(fileUrl);

    // 再生開始
    this.audio.play()
      .then(() => {
        this.isPlaying = true;
        updatePlayPauseButton(true);
      })
      .catch(error => {
        console.error("再生エラー:", error);
      });
  }

  pause() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  resume() {
    if (this.audio && !this.isPlaying) {
      this.audio.play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(error => {
          console.error("再生再開エラー:", error);
        });
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.isPlaying = false;
      this.currentTrack = null;
    }
  }

  // 音量調整
  setVolume(volume) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // 現在の再生時間を取得
  getCurrentTime() {
    return this.audio ? this.audio.currentTime : 0;
  }

  // 曲の長さを取得
  getDuration() {
    return this.audio ? this.audio.duration : 0;
  }
}

const musicPlayer = new MusicPlayer();

export { musicPlayer };

export function secondsToMinutes(seconds) {
  if (!seconds) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}