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
