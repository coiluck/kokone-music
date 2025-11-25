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
      const newValue = e.target.value;
      document.documentElement.style.setProperty(`--${key}`, newValue);
      updateColorLabel(input, newValue);
    });
    input.addEventListener('change', async (e) => {
      const newValue = e.target.value;
      const currentColors = await getStoreColors();
      currentColors[key] = newValue;
      await window.settings.set('colors', currentColors);
    });
  });
  // 下の関数を集めておく
}

// font
async function getStoreFont() {
  const font = await window.settings.get('font');
  return font || '"Noto Sans JP", sans-serif';
}
function applyFont(fontValue) {
  document.documentElement.style.setProperty('--font', fontValue);
  window.settings.set('font', fontValue);
}

// color
async function getStoreColors() {
  const defaultColors = {
    accent: '#ff7f7e',
    text: '#fff3f1',
    bg: '#0a0f1e'
  };
  const savedColors = await window.settings.get('colors');
  return savedColors || defaultColors;
}
function applyColors(colors) {
  document.documentElement.style.setProperty('--accent', colors.accent);
  document.documentElement.style.setProperty('--text', colors.text);
  document.documentElement.style.setProperty('--bg', colors.bg);
}
function updateColorLabel(inputElement, value) {
  const label = inputElement.parentElement.querySelector('.setting-color-value');
  label.textContent = value;
}