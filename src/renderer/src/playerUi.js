// src/renderer/src/playerUi.js
import { musicPlayer } from './modules/music.js';

export function setupPlayerUi(title, artist, duration) {
  // 曲が選択されたとき
  document.getElementById('playerUI-container').classList.add('active');
  document.getElementById('playerUI-title').textContent = title;
  document.getElementById('playerUI-artist').textContent = artist;
  document.getElementById('playerUI-duration-total').textContent = duration;
}

document.getElementById('playerUI-button-prev').addEventListener('click', () => {
  musicPlayer.prev();
});
document.getElementById('playerUI-button-next').addEventListener('click', () => {
  musicPlayer.next();
});


document.getElementById('playerUI-button-pause').addEventListener('click', () => {
  musicPlayer.pause();
  updatePlayPauseButton(false);
});
document.getElementById('playerUI-button-play').addEventListener('click', () => {
  musicPlayer.resume();
  updatePlayPauseButton(true);
});
export function updatePlayPauseButton(isPlaying) {
  const playButton = document.getElementById('playerUI-button-play');
  const pauseButton = document.getElementById('playerUI-button-pause');

  if (isPlaying) {
    playButton.style.display = 'none';
    pauseButton.style.display = 'block';
  } else {
    playButton.style.display = 'block';
    pauseButton.style.display = 'none';
  }
}

document.getElementById('playerUI-button-repeat-settings').addEventListener('click', () => {
  cycleRepeatMode();
});
export function updateRepeatButton(mode) {
  const buttons = {
    'list-order': document.getElementById('playerUI-button-list-order'),
    'repeat': document.getElementById('playerUI-button-repeat'),
    'repeat-one': document.getElementById('playerUI-button-repeat-one'),
    'shuffle': document.getElementById('playerUI-button-shuffle')
  };

  // すべて非表示
  Object.values(buttons).forEach(btn => {
    btn.style.display = 'none';
  });

  // 指定されたモードのみ表示
  if (buttons[mode]) {
    buttons[mode].style.display = 'block';
  }
}
function cycleRepeatMode() {
  const modes = ['list-order', 'repeat', 'repeat-one', 'shuffle'];
  const currentIndex = modes.indexOf(musicPlayer.repeatMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  musicPlayer.repeatMode = modes[nextIndex];

  // ログ
  const messages = {
    'list-order': 'リスト順で再生',
    'repeat': 'この曲をリピート',
    'repeat-one': '終了したら停止',
    'shuffle': 'シャッフル再生'
  };
  console.log(messages[musicPlayer.repeatMode]);

  updateRepeatButton(musicPlayer.repeatMode);
  return musicPlayer.repeatMode;
}


document.addEventListener('keydown', (event) => {
  // スペースキーで再生/停止
  if (event.code === 'Space') {
    event.preventDefault();

    if (musicPlayer.isPlaying) {
      musicPlayer.pause();
      updatePlayPauseButton(false);
    } else {
      musicPlayer.resume();
      updatePlayPauseButton(true);
    }
  }
});