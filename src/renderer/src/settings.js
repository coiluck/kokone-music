// src/renderer/src/settings.js
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
  const userColors = await getStoreColors();
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
      const currentColors = await getStoreColors();
      currentColors[key] = newValue;
      await window.settings.set('colors', currentColors);
    });
  });
  // 下の関数を集めておく
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

