// src/renderer/src/settings.js
let userColors = {};

export async function applySettings() {
  const userFont = await getStoreFont();
  applyFont(userFont);
  // font用
  document.getElementById('setting-font-select').value = userFont; // optionを選択状態に
  document.getElementById('setting-font-select').addEventListener('change', (e) => {
    const selectedFont = e.target.value;
    applyFont(selectedFont);
  });
  // color用
  userColors = await getStoreColors();
  applyColors(userColors);
  ['accent', 'text', 'bg'].forEach(key => {
    const input = document.querySelector(`input[name="${key}"]`);
    input.value = userColors[key];
    updateColorLabel(input, userColors[key]);
    input.addEventListener('input', (e) => {
      // 見た目の変更
      userColors[key] = e.target.value;
      applyColors(userColors);
      document.documentElement.style.setProperty(`--${key}`, e.target.value);
      updateColorLabel(input, e.target.value);
    });
    input.addEventListener('change', async (e) => {
      // 保存
      const newValue = e.target.value;
      userColors[key] = newValue;
      await window.settings.set('colors', userColors);
    });
  });
  // icon用
  const userIconStyle = await getStoreIconStyle();
  applyIconStyle(userIconStyle);
  document.querySelector(`input[name="icon-style"][value="${userIconStyle}"]`).checked = true;
  // window size用
  const userWindowSize = await getStoreWindowSize();
  if (userWindowSize.isNeedRememberWindowSize) {
    document.getElementById('setting-is-need-remember-window-size').checked = true;
  }
  // reccomended用
  const userReccomended = await getStoreReccomended();
  applyReccomended(userReccomended);
  // normalize music volume用
  const userNormalizeMusicVolume = await getStoreNormalizeMusicVolume();
  applyNormalizeMusicVolume(userNormalizeMusicVolume);
  // music volume用
  const userMusicVolume = await getStoreMusicVolume();
  applyMusicVolume(userMusicVolume);
}

// 初期値
const DEFAULT_FONT = '"Noto Sans JP", sans-serif';
const DEFAULT_COLORS = {
  accent: '#ff7f7e',
  text: '#fff3f1',
  bg: '#0a0f1e'
};

// reset
document.getElementById('setting-reset').addEventListener('click', async () => {
  // font
  applyFont(DEFAULT_FONT);
  document.getElementById('setting-font-select').value = DEFAULT_FONT;
  // color
  userColors = { ...DEFAULT_COLORS };
  applyColors(DEFAULT_COLORS);
  ['accent', 'text', 'bg'].forEach(key => {
    const input = document.querySelector(`input[name="${key}"]`);
    input.value = DEFAULT_COLORS[key];
    updateColorLabel(input, DEFAULT_COLORS[key]);
  });
  await window.settings.set('colors', DEFAULT_COLORS);
});

// font
async function getStoreFont() {
  const font = await window.settings.get('font');
  return font || DEFAULT_FONT;
}
function applyFont(fontValue) {
  document.documentElement.style.setProperty('--font', fontValue);
  window.settings.set('font', fontValue);
}

// color
async function getStoreColors() {
  const savedColors = await window.settings.get('colors');
  return savedColors || DEFAULT_COLORS;
}
function applyColors(colors) {
  document.documentElement.style.setProperty('--accent', colors.accent);
  document.documentElement.style.setProperty('--text', colors.text);
  document.documentElement.style.setProperty('--bg', colors.bg);
  // こっちで決めるやつ
  const isBbright = judgeBrightness(colors.bg);
  if (isBbright) {
    const mildBg = makeMildBg(colors.bg, 'darker');
    document.documentElement.style.setProperty('--bg-mild', mildBg);
    document.documentElement.style.setProperty('--bg-hover', 'rgba(0, 0, 0, 0.1)');
  } else {
    const mildBg = makeMildBg(colors.bg, 'lighter');
    document.documentElement.style.setProperty('--bg-mild', mildBg);
    document.documentElement.style.setProperty('--bg-hover', 'rgba(255, 255, 255, 0.1)');
  }
}
function updateColorLabel(inputElement, value) {
  // 横のラベルテキストを更新
  const label = inputElement.parentElement.querySelector('.setting-color-value');
  label.textContent = value;
}
function judgeBrightness(color) {
  // 明るさを判断
  const rgb = color.match(/\w\w/g).map(hex => parseInt(hex, 16)); // [r, g, b]
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return brightness > 128;
}
function makeMildBg(baseColor, mode, percent = 10) {
  // RGBに変換
  let rgb = baseColor.match(/\w\w/g).map(hex => parseInt(hex, 16));
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;

  // HSLに変換
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // 無彩色
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // 輝度を調整
  const adjustment = mode === 'lighter' ? (percent / 100) : -(percent / 100);
  l = Math.max(0, Math.min(1, l + adjustment));

  // RGBに戻す
  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }

  // 16進数に戻す
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

// icon style
async function getStoreIconStyle() {
  const iconStyle = await window.settings.get('icon-style');
  return iconStyle || 'outline';
}
function applyIconStyle(iconStyle) { // fill or outline
  const suffix = iconStyle === 'outline' ? 'line' : 'fill';

  document.querySelectorAll('.left-panel-item').forEach((item) => {
    const currentStyle = item.querySelector('.left-panel-item-icon').style.getPropertyValue('--icon-file');
    const newStyle = currentStyle.replace(/_(fill|line)\.svg/, `_${suffix}.svg`);
    item.querySelector('.left-panel-item-icon').style.setProperty('--icon-file', newStyle);
  });

  window.settings.set('icon-style', iconStyle);
}
document.querySelectorAll('input[name="icon-style"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    applyIconStyle(e.target.value);
  });
});

// window size
async function getStoreWindowSize() {
  const windowSize = await window.settings.get('window-size');
  return windowSize;
}

// reccomended
async function getStoreReccomended() {
  const reccomended = await window.settings.get('reccomended');
  return reccomended;
}
function applyReccomended(userReccomended) {
  document.getElementById('setting-is-need-recommend').checked = userReccomended.isNeedRecommend;
  document.getElementById('setting-recent-select').value = userReccomended.recommendDays;
}
document.getElementById('setting-is-need-recommend').addEventListener('change', (e) => {
  window.settings.set('reccomended', {
    isNeedRecommend: e.target.checked,
    recommendDays: Number(document.getElementById('setting-recent-select').value)
  });
});
document.getElementById('setting-recent-select').addEventListener('change', (e) => {
  window.settings.set('reccomended', {
    isNeedRecommend: document.getElementById('setting-is-need-recommend').checked,
    recommendDays: Number(e.target.value)
  });
});

import { musicPlayer } from './modules/music.js';

// normalize music volume
async function getStoreNormalizeMusicVolume() {
  const normalizeMusicVolume = await window.settings.get('normalize-music-volume');
  return normalizeMusicVolume;
}
function applyNormalizeMusicVolume(normalizeMusicVolume) {
  document.getElementById('setting-normalize-music-volume').checked = normalizeMusicVolume;
  musicPlayer.setNormalizationEnabled(normalizeMusicVolume);
}
document.getElementById('setting-normalize-music-volume').addEventListener('change', (e) => {
  window.settings.set('normalize-music-volume', e.target.checked);
  musicPlayer.setNormalizationEnabled(e.target.checked);
});
// music volume
async function getStoreMusicVolume() {
  const musicVolume = await window.settings.get('music-volume');
  return musicVolume;
}
function applyMusicVolume(musicVolume) {
  document.getElementById('setting-volume').value = musicVolume;
  document.getElementById('setting-volume-value').textContent = musicVolume + '%';
}
document.getElementById('setting-volume').addEventListener('input', (e) => {
  document.getElementById('setting-volume-value').textContent = e.target.value + '%';
  const value = Number(e.target.value);
  musicPlayer.setVolume(value / 100);
});
document.getElementById('setting-volume').addEventListener('change', (e) => {
  const value = Number(e.target.value);
  window.settings.set('music-volume', value);
});



// open userdata folder
document.getElementById('setting-export').addEventListener('click', () => {
  window.openUserDataFolder.open();
});
// delete history
document.getElementById('setting-delete-history').addEventListener('click', () => {
  if (confirm(`ここで削除を行わない場合でも、再生履歴は30日後に自動的に削除されます。\nすべての再生履歴を直ちに削除してよろしいですか。`)) {
    window.music.deleteHistory();
    window.message.showMessage('再生履歴を削除しました。', false);
  }
});