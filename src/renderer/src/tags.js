// src/renderer/src/tags.js
export function setupTags() {
  // atode
}


function addTagChip(container, input, isExclude = false) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim() !== '') {
      e.preventDefault();

      const tagText = input.value.trim();

      // 重複チェック（オプション）
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
        // 検索
      });

      container.insertBefore(chip, input);
      input.value = '';

      // 検索
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
    const currentCondition = e.target.value;
    console.log('条件切り替え:', currentCondition);
    // 検索
  });
});