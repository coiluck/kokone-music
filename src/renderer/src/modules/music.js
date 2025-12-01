// src/renderer/src/modules/music.js
import { setupPlayerUi, updatePlayPauseButton } from '../playerUi.js';

class MusicPlayer {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.repeatMode = 'list-order'; // 'list-order', 'repeat', 'repeat-one', 'shuffle'
    this.updateInterval = null;
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

    // エラー
    this.audio.addEventListener('error', (e) => {
      this.error(e)
    });

    // 再生開始
    this.audio.play()
      .then(() => {
        this.isPlaying = true;
        updatePlayPauseButton(true);
        this.startTimeUpdate();
      })
      .catch(error => {
        this.error(error)
      });


    this.audio.addEventListener('ended', () => {
      this.stopTimeUpdate();
      // 次の曲再生などの処理をここに追加
    });
  }

  pause() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.stopTimeUpdate();
    }
  }

  resume() {
    if (this.audio && !this.isPlaying) {
      this.audio.play()
        .then(() => {
          this.isPlaying = true;
          this.startTimeUpdate();
        })
        .catch(error => {
          this.error(error)
        });
    }
  }

  stop() {
    this.stopTimeUpdate();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.removeAttribute('src');
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
    if (this.audio) {
      const audioDuration = this.audio.duration;
      if (audioDuration && audioDuration !== Infinity && !isNaN(audioDuration)) {
        return audioDuration;
      }
      if (this.currentTrack && this.currentTrack.duration > 0) {
        return this.currentTrack.duration;
      }
    }
    return 0;
  }

  startTimeUpdate() {
    this.stopTimeUpdate(); // 既存のものがあれば停止

    const update = () => {
      if (this.audio && this.isPlaying) {
        this.updateTimeDisplay();
        this.updateInterval = requestAnimationFrame(update);
      }
    };

    this.updateInterval = requestAnimationFrame(update);
  }

  // 時間更新を停止
  stopTimeUpdate() {
    if (this.updateInterval) {
      cancelAnimationFrame(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // 表示を更新
  updateTimeDisplay() {
    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();

    // 現在時刻を更新
    const currentElement = document.getElementById('playerUI-duration-current');
    if (currentElement) {
      currentElement.textContent = secondsToMinutes(currentTime);
    }

    // シークバーを更新
    const seekbarCurrent = document.getElementById('playerUI-duration-seekbar-current');
    if (seekbarCurrent && duration > 0) {
      const percentage = (currentTime / duration) * 100;
      seekbarCurrent.style.width = `${percentage}%`;
    }
  }

  error(e) {
    const error = e;
    console.error('[MusicPlayer] Error occurred:', {
      code: error?.code,
      message: error?.message,
    });

    this.isPlaying = false;
    updatePlayPauseButton(false);
    this.stopTimeUpdate();

    const shouldReload = confirm(
      `再生エラーが発生しました。\n(Code: ${error?.code} - ${error?.message})\n\nアプリを再読み込みして復帰しますか？`
    );
    if (shouldReload) {
      window.location.reload();
    }
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