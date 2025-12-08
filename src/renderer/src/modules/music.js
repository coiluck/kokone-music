// src/renderer/src/modules/music.js
import { setupPlayerUi, updatePlayPauseButton } from '../playerUi.js';

class MusicPlayer {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.repeatMode = 'list-order'; // 'list-order', 'repeat', 'repeat-one', 'shuffle'
    this.updateInterval = null;
    this.playlist = [];
    this.currentIndex = -1;
    this.shuffleHistory = [];
  }

  play(filePath, trackInfo = {}, playlist = null) {
    // 既存の再生を停止
    this.stop();

    // 新しい曲情報を保存
    this.currentTrack = {
      id: trackInfo.id,
      path: filePath,
      title: trackInfo.title || 'Unknown',
      artist: trackInfo.artist || 'Unknown',
      duration: trackInfo.duration || 0
    };

    if (playlist) {
      // この曲のプレイリスト内の位置
      this.playlist = playlist;
      this.currentIndex = this.playlist.findIndex(track => track.id === trackInfo.id);
      this.shuffleHistory = [this.currentIndex]; // 新しいプレイリストなら破棄
    }

    setupPlayerUi(
      this.currentTrack.title,
      this.currentTrack.artist,
      secondsToMinutes(this.currentTrack.duration)
    );

    // 新しいAudioインスタンスを作成
    const fileUrl = `media://play?path=${encodeURIComponent(filePath)}`;
    this.audio = new Audio(fileUrl);

    // エラー
    this.audio.addEventListener('error', (e) => {
      this.error(e)
    });

    this.audio.addEventListener('ended', () => {
      this.stopTimeUpdate();
      // 次の曲再生などの処理
      console.log(this.repeatMode);
      if (this.repeatMode === 'repeat') {
        // リピート
        this.play(this.currentTrack.path, this.currentTrack, null); // プレイリストは維持
      } else if (this.repeatMode === 'will-stop') {
        // 停止
        this.isPlaying = false;
        updatePlayPauseButton(false);
      } else {
        // 残りはリスト順とシャッフル
        // これはUIの`#playerUI-button-next`からも呼ばれるからこの中でも処理書く！
        this.next();
      }
    });

    // 再生開始
    this.audio.play()
      .then(() => {
        this.isPlaying = true;
        updatePlayPauseButton(true);
        this.startTimeUpdate();
        // 再生履歴を保存
        window.music.addHistory(this.currentTrack.id);
      })
      .catch(error => {
        this.error(error)
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

  prev() {
    if (this.playlist.length === 0) return;

    // 再生時間が1秒以上経過していれば曲の頭に戻る
    if (this.audio && this.audio.currentTime > 1) {
      this.audio.currentTime = 0;
      return;
    }

    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = 0; // 最初なら先頭のまま
    }

    this.playAtIndex(prevIndex);
  }

  next() {
    if (this.playlist.length === 0) {
      return;
    }

    let nextIndex;

    if (this.repeatMode === 'shuffle') {
      nextIndex = this.getNextShuffleIndex();
    } else if (this.repeatMode === 'repeat') {
      this.play(this.currentTrack.path, this.currentTrack, null); // プレイリストは維持
      return;
    } else {
      nextIndex = this.currentIndex + 1
      if (nextIndex >= this.playlist.length) {
        // リストの最後まで来たら最初から
        nextIndex = 0;
      }
    }
    this.playAtIndex(nextIndex); // 次の曲へ
  }

  playAtIndex(index) {
    if (index >= 0 && index < this.playlist.length) {
      const track = this.playlist[index];
      this.play(track.path, track, null); // プレイリストを上書きしないnull
      this.currentIndex = index;
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
    
  getNextShuffleIndex() {
    // 全曲再生済みならリセット
    if (this.shuffleHistory.length >= this.playlist.length) {
      this.shuffleHistory = [];
    }

    // まだ再生していない曲のインデックスを取得
    const unplayedIndices = [];
    for (let i = 0; i < this.playlist.length; i++) {
      if (!this.shuffleHistory.includes(i)) {
        unplayedIndices.push(i);
      }
    }

    // ランダムに選択
    const randomIndex = Math.floor(Math.random() * unplayedIndices.length);
    const nextIndex = unplayedIndices[randomIndex];
    this.shuffleHistory.push(nextIndex);

    return nextIndex;
  }

  removeTrackFromPlaylist(trackId) {
    if (!this.playlist || this.playlist.length === 0) return;

    const index = this.playlist.findIndex(track => track.id === trackId);
    if (index === -1) return;

    // 現在再生中の曲なら停止
    if (this.currentTrack && this.currentTrack.id === trackId) {
      this.stop();
      updatePlayPauseButton(false);
      document.getElementById('playerUI-container').classList.remove('active');
    } else if (index < this.currentIndex) {
      this.currentIndex--;
    }
    this.playlist.splice(index, 1);
    this.shuffleHistory = [];
  }

  error(e) {
    const errorObj = this.audio ? this.audio.error : null;
    const errorCode = errorObj ? errorObj.code : 'unknown';
    const errorMessage = errorObj ? errorObj.message : 'An unknown error occurred';

    console.error('[MusicPlayer] Error occurred:', {
      code: errorCode,
      message: errorMessage,
      rawEvent: e
    });
    this.isPlaying = false;
    updatePlayPauseButton(false);
    this.stopTimeUpdate();

    const shouldReload = confirm(
      `再生エラーが発生しました。\n(Code: ${e?.code} - ${e?.message})\n\nアプリを再読み込みして復帰しますか？`
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