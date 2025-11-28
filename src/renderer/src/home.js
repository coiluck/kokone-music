// src/renderer/src/home.js
import { musicPlayer } from './modules/music.js';

export function setupHome() {
  setUpReccomended();
  scanAllMusic();
}

function setUpReccomended() {
  // 後で書く
}

async function scanAllMusic() {
  const allMusic = await window.music.getAllMusic();

  const homeContainer = document.getElementById('home-all-music');
  // リストをクリアしてから追加（重複防止）
  homeContainer.innerHTML = '';

  for (const music of allMusic) {
    const musicElement = document.createElement('div');
    musicElement.classList.add('home-list-item');

    // デザインに合わせてHTML構造を作成
    // 例: タイトル - アーティスト [時間]
    musicElement.innerHTML = `
      <div class="music-info">
        <span class="music-title">${music.title}</span>
        <span class="music-artist">${music.artist}</span>
      </div>
      <span class="music-duration">${secondsToMinutes(music.duration)}</span>
    `;

    // クリックイベントリスナー：音楽を再生
    musicElement.addEventListener('click', () => {
      playMusic(music);
    });

    homeContainer.appendChild(musicElement);
  }
}

// 音楽再生用の関数
function playMusic(musicItem) {
  musicPlayer.play(musicItem.path, {
    title: musicItem.title,
    artist: musicItem.artist,
    duration: musicItem.duration
  });
  console.log(`Playing: ${musicItem.path}`);
}
function secondsToMinutes(seconds) {
  if (!seconds) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}