// src/renderer/src/home.js
import { musicPlayer, secondsToMinutes } from './modules/music.js';

export async function setupHome() {
  // 処理を待つ必要はないのでawaitは不要
  setUpReccomended();
  scanAllMusic();
}

async function setUpReccomended() {
  const history = await window.music.getHistory() || [];
  const allMusic = await window.music.getAllMusic() || [];
  // 最近の判定
  const daysAgo = Date.now() - (document.getElementById('setting-recent-select').value * 24 * 60 * 60 * 1000);
  const recentHistory = history.filter(h => h.playedAt >= daysAgo);

  if (recentHistory.length < 5 || allMusic.length < 5) {
    // データが足りないので非表示
    document.getElementById('home-recommended-title').style.display = 'none';
    document.getElementById('home-recommended').style.display = 'none';
    return;
  } else if (0 > 1) {
    // おすすめを表示しない設定の場合
    // 今はこの判定に一致することはない
    document.getElementById('home-recommended-title').style.display = 'none';
    document.getElementById('home-recommended').style.display = 'none';
    return;
  } else {
    document.getElementById('home-recommended-title').style.display = 'block';
    document.getElementById('home-recommended').style.display = 'flex';
  }
  const weight = {
    // 別に合計が1にならなくてもいいので自由に変えてください
    playCount: 0.4,
    tagCount: 0.4,
    artistCount: 0.3,
    addedAt: 0.2
  }
  const trackPlayCounts = {}; // 曲ごとの再生回数
  const artistPlayCounts = {}; // アーティストごとの再生回数
  const tagFrequency = {}; // タグごとの出現回数
  let maxTrackPlays = 0; // 最大再生数
  let maxArtistPlays = 0; // 最大アーティスト再生数
  let maxTagFreq = 0; // 最大タグ出現数

  const trackMap = new Map(allMusic.map(t => [t.id, t]));

  for (const log of recentHistory) {
    const trackId = log.trackId;
    const track = trackMap.get(trackId);
    // 履歴にある曲がライブラリに残っている場合のみ集計
    if (track) {
      // 再生数カウント
      trackPlayCounts[trackId] = (trackPlayCounts[trackId] || 0) + 1;
      maxTrackPlays = Math.max(maxTrackPlays, trackPlayCounts[trackId]);
      // アーティストカウント
      const artist = track.artist || 'Unknown';
      artistPlayCounts[artist] = (artistPlayCounts[artist] || 0) + 1;
      maxArtistPlays = Math.max(maxArtistPlays, artistPlayCounts[artist]);
      // タグカウント
      if (track.tags && Array.isArray(track.tags)) {
        for (const tag of track.tags) {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
          maxTagFreq = Math.max(maxTagFreq, tagFrequency[tag]);
        }
      }
    }
  }

  // ============ このしたは数字見て楽しむ用 ============
  // 曲Top10
  const topTracks = Object.entries(trackPlayCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, count]) => {
      const track = trackMap.get(Number(id)) || trackMap.get(String(id)) || trackMap.get(id);
      return {
        title: track ? track.title : `Unknown ID: ${id}`,
        count: count
      };
    });
  console.log('=== Top 10 Played Tracks ===');
  console.table(topTracks);
  // アーティストTop10
  const topArtists = Object.entries(artistPlayCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([artist, count]) => ({ artist, count }));
  console.log('=== Top 10 Artists ===');
  console.table(topArtists);
  // タグTop10
  const topTags = Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
  console.log('=== Top 10 Tags ===');
  console.table(topTags);
  // ============ このうえは数字見て楽しむ用 ============

  const scoredMusic = allMusic.map(track => {
    // 曲の再生回数
    const playCount = trackPlayCounts[track.id] || 0;
    // 最大値で割る、0.0 ~ 1.0
    const s_play = maxTrackPlays > 0 ? (playCount / maxTrackPlays) : 0;

    // アーティストの再生回数
    const artistPlays = artistPlayCounts[track.artist] || 0;
    const s_artist = maxArtistPlays > 0 ? (artistPlays / maxArtistPlays) : 0;

    // タグの喜欢度
    let tagScoreSum = 0;
    if (track.tags && track.tags.length > 0) {
      track.tags.forEach(tag => {
        tagScoreSum += (tagFrequency[tag] || 0);
      });
      // 最大値で割る、0.0 ~ 1.0
      const denominator = track.tags.length * maxTagFreq;
      tagScoreSum = denominator > 0 ? (tagScoreSum / denominator) : 0;
    }
    const s_tag = tagScoreSum;

    // 現在時に近いほど1.0、古いほど 0.0に近づく
    const timeDiff = Date.now() - track.addedAt; // 新しいほど数が小さい
    const s_added = Math.max(0, 1 - (timeDiff / daysAgo));

    // 総合スコア
    const totalScore =
      (s_play * weight.playCount) +
      (s_artist * weight.artistCount) +
      (s_tag * weight.tagCount) +
      (s_added * weight.addedAt);

    return { ...track, score: totalScore };
  });

  // スコアの降順でソート
  scoredMusic.sort((a, b) => b.score - a.score);
  // 上位10曲を抽出
  const recommendedTracks = scoredMusic.slice(0, 10);
  // DOMに描画
  document.getElementById('home-recommended').innerHTML = '';
  for (const track of recommendedTracks) {
    const trackElement = document.createElement('div');
    trackElement.classList.add('home-recommended-item');
    trackElement.innerHTML = `
      <div class="home-recommended-item-icon-container">
        <div class="home-recommended-item-icon"></div>
      </div>
      <div class="home-recommended-item-text">
        <span class="home-recommended-item-title">${track.title}</span>
        <div class="home-recommended-item-info">
          <span class="home-recommended-item-artist">${track.artist}</span>
          <span class="home-recommended-item-duration">${secondsToMinutes(track.duration)}</span>
        </div>
      </div>
    `;
    document.getElementById('home-recommended').appendChild(trackElement);
    trackElement.addEventListener('click', () => {
      playMusic(track);
    });
  }
}

import { showActionMenu } from './modules/actionMusic.js'

async function scanAllMusic() {
  const allMusic = await window.music.getAllMusic();

  const homeContainer = document.getElementById('home-all-music');
  homeContainer.innerHTML = '';

  for (const music of allMusic) {
    const musicElement = document.createElement('div');
    musicElement.classList.add('home-list-item');

    musicElement.innerHTML = `
      <div class="home-list-item-icon-container">
        <div class="home-list-item-icon"></div>
      </div>
      <div class="home-list-item-text">
        <span class="home-list-item-title">${music.title}</span>
        <div class="home-list-item-info">
          <div class="home-list-item-info-left">
            <span class="home-list-item-artist">${music.artist}</span>
            <span class="home-list-item-separator">・</span>
            <span class="home-list-item-duration">${secondsToMinutes(music.duration)}</span>
          </div>
          <div class="home-list-item-tags">
            ${music.tags.map(tag => `<span class="home-list-item-tag">${tag}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="home-list-item-actions"></div>
    `;

    musicElement.addEventListener('click', () => {
      playMusic(music);
    });

    musicElement.querySelector('.home-list-item-actions').addEventListener('click', (e) => {
      e.stopPropagation();
      showActionMenu(e, music);
    });

    homeContainer.appendChild(musicElement);
  }
}

// 音楽再生用の関数
function playMusic(musicItem) {
  musicPlayer.play(musicItem.path, {
    id: musicItem.id,
    title: musicItem.title,
    artist: musicItem.artist,
    duration: musicItem.duration
  });
  console.log(`Playing: ${musicItem.path}`);
}