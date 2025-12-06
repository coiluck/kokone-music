// src/renderer/src/tags.js
import { musicPlayer, secondsToMinutes } from './modules/music.js';

export function setupTags() {
  searchMusic();
}


function addTagChip(container, input, isExclude = false) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim() !== '') {
      e.preventDefault();

      const tagText = input.value.trim();

      // 重複チェック
      const existingTags = Array.from(container.querySelectorAll('.tag-chip span:first-child'))
        .map(span => span.textContent);

      if (existingTags.includes(tagText)) {
        input.value = '';
        return;
      }

      const chip = document.createElement('div');
      chip.className = isExclude ? 'tag-chip exclude' : 'tag-chip';
      chip.innerHTML = `
        <span>${tagText}</span>
        <span class="tag-chip-remove">×</span>
      `;

      chip.querySelector('.tag-chip-remove').addEventListener('click', () => {
        chip.remove();
        searchMusic();
      });

      container.insertBefore(chip, input);
      input.value = '';

      searchMusic();
    }
  });
}

const includeInput = document.querySelector('#tags-include-container .tags-input');
const includeContainer = document.querySelector('#tags-include-container');
addTagChip(includeContainer, includeInput, false);

const excludeInput = document.querySelector('#tags-exclude-container .tags-input');
const excludeContainer = document.querySelector('#tags-exclude-container');
addTagChip(excludeContainer, excludeInput, true);

const conditionRadios = document.querySelectorAll('input[name="tags-condition"]');
conditionRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    searchMusic();
  });
});



async function searchMusic() {
  // 取得
  const includeTags = Array.from(document.querySelectorAll('#tags-include-container .tag-chip span:first-child'))
    .map(span => span.textContent);

  const excludeTags = Array.from(document.querySelectorAll('#tags-exclude-container .tag-chip span:first-child'))
    .map(span => span.textContent);

  const conditionRadio = document.querySelector('input[name="tags-condition"]:checked');
  const requirement = conditionRadio ? conditionRadio.value : 'AND';

  // 検索
  const results = await window.music.filterByTags({
    tags: includeTags,
    excludeTags: excludeTags,
    requirement: requirement
  });
  results.sort((a, b) => a.title.localeCompare(b.title, 'ja'));

  // 描画
  renderMusicList(results);
}

import { showActionMenu } from './modules/actionMusic.js';

function renderMusicList(musicList) {
  const resultContainer = document.getElementById('tags-all-music');
  resultContainer.innerHTML = '';

  if (musicList.length === 0) {
    resultContainer.innerHTML = '<div class="no-results tags">該当する曲が見つかりませんでした</div>';
    return;
  }

  for (const music of musicList) {
    const musicElement = document.createElement('div');
    musicElement.classList.add('home-list-item'); // home.cssのスタイルを再利用

    musicElement.innerHTML = `
      <div class="tags-list-item-icon-container">
        <div class="tags-list-item-icon"></div>
      </div>
      <div class="tags-list-item-text">
        <span class="tags-list-item-title">${music.title}</span>
        <div class="tags-list-item-info">
          <div class="tags-list-item-info-left">
            <span class="tags-list-item-artist">${music.artist}</span>
            <span class="tags-list-item-separator">・</span>
            <span class="tags-list-item-duration">${secondsToMinutes(music.duration)}</span>
          </div>
          <div class="tags-list-item-tags">
            ${music.tags.map(tag => `<span class="tags-list-item-tag">${tag}</span>`).join('')}
          </div>
        </div>

      </div>
      <div class="tags-list-item-actions"></div>
    `;

    // クリックで再生
    musicElement.addEventListener('click', () => {
      playMusic(music, musicList);
    });

    // 右クリック/アクションメニュー
    musicElement.querySelector('.tags-list-item-actions').addEventListener('click', (e) => {
      e.stopPropagation();
      showActionMenu(e, music);
    });

    resultContainer.appendChild(musicElement);
  }
}

// 音楽再生用のヘルパー関数
function playMusic(musicItem, musicList) {
  musicPlayer.play(musicItem.path, {
    id: musicItem.id,
    title: musicItem.title,
    artist: musicItem.artist,
    duration: musicItem.duration
  }, musicList);
}