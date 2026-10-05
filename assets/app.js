'use strict';

(function () {
  /**
   * Helper: create a DOM element safely without innerHTML
   * @param {string} tag
   * @param {string} [className]
   * @param {string} [text]
   * @returns {HTMLElement}
   */
  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined && text !== null) {
      element.textContent = text;
    }
    return element;
  }

  /**
   * Capitalize string
   * @param {string} str
   * @returns {string}
   */
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format star symbol
   * @param {number} star
   * @returns {string}
   */
  function getStarSymbol(star) {
    if (star === 0) return '☆';
    if (star === 1) return '★';
    if (star === 2) return '★★';
    if (star === 3) return '★★★';
    return star + '★';
  }

  /**
   * Safe image creator with lazy loading and placeholder fallback
   * @param {string|null} src
   * @param {string} alt
   * @param {string} className
   * @param {string} placeholderChar
   * @returns {HTMLElement}
   */
  function createImage(src, alt, className, placeholderChar) {
    if (!src) {
      const ph = el('div', className + ' image-placeholder', placeholderChar || (alt ? alt.charAt(0) : '?'));
      ph.setAttribute('aria-label', alt || 'Image');
      return ph;
    }
    const img = document.createElement('img');
    img.className = className;
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    img.addEventListener('error', function () {
      const parent = img.parentElement;
      if (parent) {
        const ph = el('div', className + ' image-placeholder', placeholderChar || (alt ? alt.charAt(0) : '?'));
        ph.setAttribute('aria-label', alt || 'Image');
        parent.replaceChild(ph, img);
      }
    });
    return img;
  }

  /**
   * Get modifier class for tier value
   * @param {number} val
   * @returns {string}
   */
  function getModClass(val) {
    if (val >= 2) return 'mod-chip-2';
    if (val >= 1.5) return 'mod-chip-1_5';
    if (val >= 1.25) return 'mod-chip-1_25';
    if (val === 1) return 'mod-chip-1';
    if (val >= 0.75) return 'mod-chip-0_75';
    if (val >= 0.5) return 'mod-chip-0_5';
    if (val >= 0.25) return 'mod-chip-0_25';
    return 'mod-chip-0';
  }

  /**
   * Convert modifier string/number to multiplier number
   * @param {string|number} tier
   * @param {object} modTiers
   * @returns {number}
   */
  function parseModTier(tier, modTiers) {
    if (typeof tier === 'number') return tier;
    if (modTiers && tier in modTiers) return modTiers[tier];
    return 1;
  }

  /**
   * Create creature card
   * @param {object} creature
   * @param {object} biome
   * @param {object} data
   * @returns {HTMLElement}
   */
  function createCreatureCard(creature, biome, data) {
    const card = el('article', 'creature-card');
    card.dataset.creatureId = creature.id;
    card.dataset.creatureName = creature.name.toLowerCase();
    card.dataset.creatureKind = creature.kind;

    const starsList = (creature.stars && creature.stars.length > 0)
      ? creature.stars
      : [{ star: 0, image: null, health: null, healthText: null, attacks: [] }];

    let currentStarIndex = 0;

    // Card Top (Image + Header Info)
    const cardTop = el('div', 'card-top');

    const imageBox = el('div', 'card-image-box');
    const updateImage = (starObj) => {
      imageBox.textContent = '';
      const imgSrc = starObj.image || (creature.stars && creature.stars[0] && creature.stars[0].image) || null;
      imageBox.appendChild(createImage(imgSrc, creature.name, 'card-image', creature.name.charAt(0)));
    };
    updateImage(starsList[currentStarIndex]);

    const headerInfo = el('div', 'card-header-info');

    // Title Row
    const titleRow = el('div', 'card-title-row');
    const nameEl = el('h4', 'card-name', creature.name);
    titleRow.appendChild(nameEl);
    headerInfo.appendChild(titleRow);

    // Badges Row
    const badgesRow = el('div', 'card-badges');
    if (creature.kind === 'boss') {
      badgesRow.appendChild(el('span', 'badge badge-boss', 'Boss'));
    } else if (creature.kind === 'miniboss') {
      badgesRow.appendChild(el('span', 'badge badge-miniboss', 'Miniboss'));
    } else if (creature.kind === 'passive') {
      badgesRow.appendChild(el('span', 'badge badge-passive', 'Passive'));
    }

    if (creature.tameable) {
      badgesRow.appendChild(el('span', 'badge badge-tameable', 'Tameable'));
    }

    // Always star badge if single star > 0
    if (starsList.length === 1 && starsList[0].star > 0) {
      badgesRow.appendChild(el('span', 'badge badge-always-stars', 'Always ' + getStarSymbol(starsList[0].star)));
    }
    if (badgesRow.children.length > 0) {
      headerInfo.appendChild(badgesRow);
    }

    // Star Selector (if hasStars)
    if (creature.hasStars && starsList.length > 1) {
      const starSelector = el('div', 'star-selector');
      starSelector.setAttribute('role', 'group');
      starSelector.setAttribute('aria-label', 'Select star level');

      starsList.forEach((starObj, idx) => {
        const starBtn = el('button', 'star-btn' + (idx === 0 ? ' active' : ''), getStarSymbol(starObj.star));
        starBtn.type = 'button';
        starBtn.setAttribute('aria-label', starObj.star + ' star');
        starBtn.addEventListener('click', function () {
          currentStarIndex = idx;
          Array.from(starSelector.children).forEach(btn => btn.classList.remove('active'));
          starBtn.classList.add('active');
          updateStarView();
        });
        starSelector.appendChild(starBtn);
      });
      headerInfo.appendChild(starSelector);
    }

    cardTop.appendChild(imageBox);
    cardTop.appendChild(headerInfo);
    card.appendChild(cardTop);

    // Weak points (if any)
    if (creature.weakPoints && creature.weakPoints.length > 0) {
      const wpBox = el('div', 'weak-points-box');
      creature.weakPoints.forEach(wp => {
        const label = el('span', 'weak-point-label', 'Weak point: ' + wp.part + ' — ');
        wpBox.appendChild(label);

        const chips = el('div', 'modifiers-chips');
        if (wp.modifiers) {
          Object.entries(wp.modifiers).forEach(([dmgType, tierStr]) => {
            const mult = parseModTier(tierStr, data.modTiers);
            const chip = el('span', 'mod-chip ' + getModClass(mult), capitalize(dmgType) + ' ×' + mult);
            chips.appendChild(chip);
          });
        }
        wpBox.appendChild(chips);
      });
      card.appendChild(wpBox);
    }

    // Health Display
    const healthBox = el('div', 'health-display');
    const healthLabel = el('span', 'health-label', 'HP');
    const healthValue = el('span', 'health-value', '—');
    const healthSubtext = el('span', 'health-subtext');

    healthBox.appendChild(healthLabel);
    healthBox.appendChild(healthValue);
    healthBox.appendChild(healthSubtext);
    card.appendChild(healthBox);

    // Attacks Section
    const attacksSection = el('div', 'card-section');
    const attacksTitle = el('span', 'card-section-title', 'Attacks');
    const attacksList = el('div', 'attacks-list');
    attacksSection.appendChild(attacksTitle);
    attacksSection.appendChild(attacksList);
    card.appendChild(attacksSection);

    // Helper to update star-dependent views (image, HP, attacks)
    const updateStarView = () => {
      const starObj = starsList[currentStarIndex];
      updateImage(starObj);

      // Determine HP
      let hpVal = null;
      if (starObj.healthByBiome && starObj.healthByBiome[biome.id] !== undefined) {
        hpVal = starObj.healthByBiome[biome.id];
      } else if (starObj.health !== null && starObj.health !== undefined) {
        hpVal = starObj.health;
      }

      if (hpVal !== null) {
        healthValue.textContent = Number(hpVal).toLocaleString();
      } else if (starObj.healthText) {
        healthValue.textContent = starObj.healthText;
      } else {
        healthValue.textContent = '—';
      }

      // HP Subtext for complex phases/parts
      healthSubtext.textContent = '';
      if (starObj.healthText && (starObj.healthText.includes('\n') || starObj.healthText.includes('+') || starObj.healthText.includes(':'))) {
        healthSubtext.textContent = starObj.healthText;
      }

      // Attacks
      attacksList.textContent = '';
      if (starObj.attacks && starObj.attacks.length > 0) {
        starObj.attacks.forEach(att => {
          const row = el('div', 'attack-row');
          const attName = el('span', 'attack-name', att.name || 'Attack');
          row.appendChild(attName);

          const dmgEntries = att.damage ? Object.entries(att.damage) : [];
          if (dmgEntries.length > 0) {
            const damagesDiv = el('div', 'attack-damages');
            dmgEntries.forEach(([type, val]) => {
              const chip = el('span', 'dmg-chip dmg-chip-' + type, val + ' ' + capitalize(type));
              damagesDiv.appendChild(chip);
            });
            row.appendChild(damagesDiv);
          } else if (att.raw) {
            const rawSpan = el('span', 'attack-raw', att.raw);
            row.appendChild(rawSpan);
          }
          attacksList.appendChild(row);
        });
      } else {
        attacksList.appendChild(el('div', 'attack-raw', 'No attacks'));
      }
    };
    updateStarView();

    // Weaknesses & Resistances
    const recKey = biome.id + ':' + creature.id;
    const rec = data.recommendations && data.recommendations[recKey];
    const modifiers = (rec && rec.modifiers) || (creature.modifiers) || {};

    const nonNeutralMods = Object.entries(modifiers).filter(([, val]) => {
      const num = parseModTier(val, data.modTiers);
      return num !== 1;
    });

    if (nonNeutralMods.length > 0 || (creature.otherImmunities && creature.otherImmunities.length > 0)) {
      const modSection = el('div', 'card-section');
      const modTitle = el('span', 'card-section-title', 'Weaknesses & Resistances');
      modSection.appendChild(modTitle);

      const modChips = el('div', 'modifiers-chips');
      // Sort non-neutral modifiers from highest multiplier to lowest
      nonNeutralMods.sort((a, b) => {
        const valA = parseModTier(a[1], data.modTiers);
        const valB = parseModTier(b[1], data.modTiers);
        return valB - valA;
      });

      nonNeutralMods.forEach(([type, tierVal]) => {
        const num = parseModTier(tierVal, data.modTiers);
        const chip = el('span', 'mod-chip ' + getModClass(num), capitalize(type) + ' ×' + num);
        modChips.appendChild(chip);
      });
      modSection.appendChild(modChips);

      // Other immunities
      if (creature.otherImmunities && creature.otherImmunities.length > 0) {
        const otherImm = el('div', 'other-immunities', 'Also immune: ' + creature.otherImmunities.join(', '));
        modSection.appendChild(otherImm);
      }

      card.appendChild(modSection);
    }

    return card;
  }

  /**
   * Main App Initialization
   */
  function initApp() {
    const data = window.VC_DATA;
    if (!data || !data.biomes) {
      const container = document.getElementById('biomes-container');
      if (container) {
        container.appendChild(el('p', 'error-msg', 'Data could not be loaded. Please ensure data/data.js is present.'));
      }
      return;
    }

    const biomesContainer = document.getElementById('biomes-container');
    if (!biomesContainer) return;

    // Sort biomes by order
    const sortedBiomes = [...data.biomes].sort((a, b) => a.order - b.order);

    // Build biomes accordion
    sortedBiomes.forEach(biome => {
      const card = el('section', 'biome-card');
      card.dataset.biomeId = biome.id;

      // Calculate total creatures
      const creaturesCount = Object.values(biome.creatures || {}).flat().length;

      // Header button
      const headerBtn = el('button', 'biome-header');
      headerBtn.type = 'button';
      headerBtn.setAttribute('aria-expanded', 'false');
      headerBtn.setAttribute('aria-controls', 'biome-content-' + biome.id);
      headerBtn.id = 'biome-header-' + biome.id;

      // Biome image background
      if (biome.image) {
        headerBtn.style.backgroundImage = 'url("' + biome.image + '")';
      }

      const headerContent = el('div', 'biome-header-content');
      const orderBadge = el('span', 'biome-order-badge', 'Biome ' + biome.order);
      const nameHeading = el('span', 'biome-name', biome.name);
      const countBadge = el('span', 'biome-count-badge', creaturesCount + (creaturesCount === 1 ? ' creature' : ' creatures'));

      headerContent.appendChild(orderBadge);
      headerContent.appendChild(nameHeading);
      headerContent.appendChild(countBadge);

      const chevron = el('span', 'biome-chevron', '▼');
      chevron.setAttribute('aria-hidden', 'true');

      headerBtn.appendChild(headerContent);
      headerBtn.appendChild(chevron);

      // Content wrapper for smooth animation
      const contentWrapper = el('div', 'biome-content-wrapper');
      contentWrapper.id = 'biome-content-' + biome.id;
      contentWrapper.setAttribute('role', 'region');
      contentWrapper.setAttribute('aria-labelledby', 'biome-header-' + biome.id);

      const content = el('div', 'biome-content');
      const contentInner = el('div', 'biome-content-inner');

      // Populate sections: Bosses, Hostile, Passive, Fish
      const bCreatures = biome.creatures || {};

      // 1. Bosses (+ Minibosses)
      const bossesList = [...(bCreatures.boss || []), ...(bCreatures.miniboss || [])];
      if (bossesList.length > 0) {
        const bossSection = el('section', 'biome-section biome-section-bosses');
        const bossTitle = el('h3', 'section-title');
        bossTitle.appendChild(document.createTextNode('Bosses '));
        bossTitle.appendChild(el('span', 'section-count', '(' + bossesList.length + ')'));
        bossSection.appendChild(bossTitle);

        const bossGrid = el('div', 'creatures-grid');
        bossesList.forEach(cId => {
          const creature = data.creatures[cId];
          if (creature) {
            bossGrid.appendChild(createCreatureCard(creature, biome, data));
          }
        });
        bossSection.appendChild(bossGrid);
        contentInner.appendChild(bossSection);
      }

      // 2. Hostile
      const hostileList = bCreatures.hostile || [];
      if (hostileList.length > 0) {
        const hostileSection = el('section', 'biome-section biome-section-hostile');
        const hostileTitle = el('h3', 'section-title');
        hostileTitle.appendChild(document.createTextNode('Hostile '));
        hostileTitle.appendChild(el('span', 'section-count', '(' + hostileList.length + ')'));
        hostileSection.appendChild(hostileTitle);

        const hostileGrid = el('div', 'creatures-grid');
        hostileList.forEach(cId => {
          const creature = data.creatures[cId];
          if (creature) {
            hostileGrid.appendChild(createCreatureCard(creature, biome, data));
          }
        });
        hostileSection.appendChild(hostileGrid);
        contentInner.appendChild(hostileSection);
      }

      // 3. Passive
      const passiveList = bCreatures.passive || [];
      if (passiveList.length > 0) {
        const passiveSection = el('section', 'biome-section biome-section-passive');
        const passiveTitle = el('h3', 'section-title');
        passiveTitle.appendChild(document.createTextNode('Passive '));
        passiveTitle.appendChild(el('span', 'section-count', '(' + passiveList.length + ')'));
        passiveSection.appendChild(passiveTitle);

        const passiveGrid = el('div', 'creatures-grid');
        passiveList.forEach(cId => {
          const creature = data.creatures[cId];
          if (creature) {
            passiveGrid.appendChild(createCreatureCard(creature, biome, data));
          }
        });
        passiveSection.appendChild(passiveGrid);
        contentInner.appendChild(passiveSection);
      }

      // 4. Fish (compact tiles for now, enhanced in step 3)
      const fishList = bCreatures.fish || [];
      if (fishList.length > 0) {
        const fishSection = el('section', 'biome-section biome-section-fish');
        const fishTitle = el('h3', 'section-title');
        fishTitle.appendChild(document.createTextNode('Fish '));
        fishTitle.appendChild(el('span', 'section-count', '(' + fishList.length + ')'));
        fishSection.appendChild(fishTitle);

        const fishGrid = el('div', 'fish-grid');
        fishList.forEach(cId => {
          const creature = data.creatures[cId];
          if (creature) {
            const tile = el('div', 'fish-tile');
            tile.dataset.creatureId = creature.id;
            tile.dataset.creatureName = creature.name.toLowerCase();
            tile.dataset.creatureKind = 'fish';

            const star0 = (creature.stars && creature.stars[0]) || {};
            const thumb = createImage(star0.image, creature.name, 'fish-thumb', creature.name.charAt(0));
            tile.appendChild(thumb);

            const info = el('div', 'fish-info');
            info.appendChild(el('span', 'fish-name', creature.name));
            const hpStr = star0.health !== null && star0.health !== undefined ? star0.health + ' HP' : '— HP';
            info.appendChild(el('span', 'fish-hp', hpStr));
            tile.appendChild(info);

            fishGrid.appendChild(tile);
          }
        });
        fishSection.appendChild(fishGrid);
        contentInner.appendChild(fishSection);
      }

      content.appendChild(contentInner);
      contentWrapper.appendChild(content);

      // Accordion toggle click handler
      headerBtn.addEventListener('click', function () {
        const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
        const nextState = !isExpanded;
        headerBtn.setAttribute('aria-expanded', String(nextState));
        if (nextState) {
          contentWrapper.classList.add('open');
        } else {
          contentWrapper.classList.remove('open');
        }
      });

      card.appendChild(headerBtn);
      card.appendChild(contentWrapper);
      biomesContainer.appendChild(card);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
