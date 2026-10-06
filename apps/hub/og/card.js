// Card script for Valheim Companion Open Graph card template.
// Reads ?section=hub|bestiary|signs|armourer|damage-calculator and siteUrl from site.config.json.

(function () {
  const SECTIONS = {
    hub: {
      title: 'VALHEIM COMPANION',
      sub: '',
      desc: 'Spoiler-free bestiary with weaknesses and best weapons for your skills, armor shopping lists and a rich-text sign editor. Updated for Valheim 1.0 and the Deep North.',
      bg: '../../bestiary/img/biomes/black-forest.png',
    },
    bestiary: {
      title: 'BESTIARY',
      sub: 'Valheim Companion',
      desc: 'Every Valheim creature and boss by biome, spoiler-free. Stats per star level, weaknesses, and the best weapons for your skills — with hits to kill.',
      bg: '../../bestiary/img/biomes/mistlands.png',
    },
    armourer: {
      title: 'ARMOURER',
      sub: 'Valheim Companion',
      desc: 'Every Valheim armor set by biome. Pick pieces and upgrade levels and get the full material list — and where to farm it.',
      bg: '../../bestiary/img/biomes/mountain.png',
    },
    'damage-calculator': {
      title: 'DAMAGE CALCULATOR',
      sub: 'Valheim Companion',
      desc: 'Pick a Valheim creature and a weapon, set skill and upgrade level and see the damage that actually lands — resistances, DPS and time-to-kill.',
      bg: '../../bestiary/img/biomes/ashlands.png',
    },
    signs: {
      title: 'SIGN EDITOR (RUNOPIS)',
      sub: 'Valheim Companion',
      desc: 'Write Valheim signs with colors, sizes and rich-text tags, see a live in-game preview and copy them straight into the game. 13 languages.',
      bg: '../../signs/public/sign-scene.png',
    },
  };

  const params = new URLSearchParams(window.location.search);
  const sectionKey = params.get('section') || 'hub';
  const data = SECTIONS[sectionKey] || SECTIONS.hub;

  const titleEl = document.getElementById('title');
  const subEl = document.getElementById('section-sub');
  const descEl = document.getElementById('desc');
  const bgEl = document.getElementById('bg-img');
  const siteUrlEl = document.getElementById('site-url');

  if (titleEl) {
    titleEl.textContent = data.title;
  }

  if (subEl) {
    subEl.textContent = data.sub;
    subEl.style.display = data.sub ? 'block' : 'none';
  }

  if (descEl) {
    descEl.textContent = data.desc;
  }

  if (bgEl) {
    bgEl.src = data.bg;
  }

  let siteUrl = params.get('siteUrl') || '';
  if (!siteUrl) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '../../../site.config.json', false);
      xhr.send(null);
      if (xhr.status === 200 || xhr.status === 0) {
        const parsed = JSON.parse(xhr.responseText);
        siteUrl = parsed.siteUrl || '';
      }
    } catch {
      // Ignore if site.config.json cannot be read synchronously
    }
  }

  if (siteUrlEl) {
    if (siteUrl) {
      siteUrlEl.textContent = siteUrl;
      siteUrlEl.style.display = 'inline-block';
    } else {
      siteUrlEl.textContent = '';
      siteUrlEl.style.display = 'none';
    }
  }
})();
