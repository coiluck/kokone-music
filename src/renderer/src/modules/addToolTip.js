export function addTooltipEvents(triggerElement, text, isBelow = false) {
  const tooltipElement = document.getElementById('tooltip-container');

  const showTooltip = () => {
    // テキストを設定
    tooltipElement.textContent = text;
    tooltipElement.style.display = 'block';
    // CSSクラスを設定（しっぽの向きを制御）
    if (isBelow) {
      tooltipElement.className = 'tooltip below';
    } else {
      tooltipElement.className = 'tooltip';
    }
    // 位置を計算
    const triggerRect = triggerElement.getBoundingClientRect();
    let topPos;
    if (isBelow) {
      topPos = triggerRect.bottom + 5; // 要素の下に配置、5pxのマージン
    } else {
      topPos = triggerRect.top - tooltipElement.offsetHeight - 5; // 要素の上に配置、5pxのマージン
    }
    const leftPos = triggerRect.left + (triggerRect.width / 2) - (tooltipElement.offsetWidth / 2);
    tooltipElement.style.top = `${topPos}px`;
    tooltipElement.style.left = `${leftPos}px`;
  };

  const hideTooltip = () => {
    tooltipElement.style.display = 'none';
  };

  // イベントリスナーを設定
  triggerElement.addEventListener('mouseover', showTooltip);
  triggerElement.addEventListener('mouseout', hideTooltip);
  triggerElement.addEventListener('click', showTooltip);
}