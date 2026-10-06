/**
 * Armourer — Valheim Companion
 * Vanilla JS Application
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VACart = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Helper to create DOM element safely without innerHTML
   */
  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  /**
   * LocalStorage Helpers (always wrapped in try/catch)
   */
  function getStoredShowAll() {
    try {
      return localStorage.getItem('va.showAll') === 'true';
    } catch {
      return false;
    }
  }

  function setStoredShowAll(val) {
    try {
      localStorage.setItem('va.showAll', String(val));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredOpenBiomes() {
    try {
      const raw = localStorage.getItem('vc.openBiomes');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setStoredOpenBiomes(openIds) {
    try {
      localStorage.setItem('vc.openBiomes', JSON.stringify(openIds));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function clearStoredOpenBiomes() {
    try {
      localStorage.removeItem('vc.openBiomes');
      localStorage.removeItem('va.showAll');
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredCart() {
    try {
      const raw = localStorage.getItem('va.cart');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setStoredCart(cart) {
    try {
      localStorage.setItem('va.cart', JSON.stringify(cart));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredBreakdown() {
    try {
      return localStorage.getItem('va.breakdown') === 'true';
    } catch {
      return false;
    }
  }

  function setStoredBreakdown(val) {
    try {
      localStorage.setItem('va.breakdown', String(val));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  /**
   * Pure calculation stubs (will be expanded in Step 3)
   */
  function calculateTotalArmor(pieces) {
    let q1 = 0;
    let max = 0;
    for (const p of pieces) {
      if (p.levels && p.levels.length > 0) {
        q1 += p.levels[0].armor || 0;
        max += p.levels[p.levels.length - 1].armor || 0;
      }
    }
    return { q1, max };
  }

  /**
   * Application Controller & DOM Rendering
   */
  function initArmourer() {
    if (typeof document === 'undefined') return;

    const data = window.VA_DATA;
    if (!data) {
      console.error('VA_DATA not found');
      return;
    }

    const biomesContainer = document.getElementById('biomes-container');
    const cosmeticsContainer = document.getElementById('cosmetics-container');
    const toggleSpoilers = document.getElementById('toggle-spoilers');
    const btnCollapseAll = document.getElementById('btn-collapse-all');
    const btnResetProgress = document.getElementById('btn-reset-progress');
    const footer = document.getElementById('page-footer');

    // Build Footer
    buildFooter(footer, data);

    // Initial state
    let showAll = getStoredShowAll();
    if (toggleSpoilers) {
      toggleSpoilers.checked = showAll;
      toggleSpoilers.addEventListener('change', function () {
        showAll = toggleSpoilers.checked;
        setStoredShowAll(showAll);
        renderCatalog();
      });
    }

    if (btnResetProgress) {
      btnResetProgress.addEventListener('click', function () {
        clearStoredOpenBiomes();
        showAll = false;
        if (toggleSpoilers) toggleSpoilers.checked = false;
        renderCatalog();
      });
    }

    if (btnCollapseAll) {
      btnCollapseAll.addEventListener('click', function () {
        const headers = document.querySelectorAll('.biome-header[aria-expanded="true"]');
        headers.forEach(h => {
          h.setAttribute('aria-expanded', 'false');
          const content = document.getElementById(h.getAttribute('aria-controls'));
          if (content) {
            content.setAttribute('inert', '');
            content.classList.remove('open');
          }
        });
      });
    }

    // Sort biomes by order
    const sortedBiomes = [...data.biomes].sort((a, b) => a.order - b.order);

    // Group armor sets
    const armorByBiome = new Map();
    sortedBiomes.forEach(b => armorByBiome.set(b.id, []));
    const cosmetics = [];

    data.armor.forEach(armor => {
      if (armor.kind === 'cosmetic' || !armor.biome) {
        cosmetics.push(armor);
      } else if (armorByBiome.has(armor.biome)) {
        armorByBiome.get(armor.biome).push(armor);
      }
    });

    function renderCatalog() {
      biomesContainer.textContent = '';
      cosmeticsContainer.textContent = '';

      const openBiomes = new Set(getStoredOpenBiomes());

      // Render each biome section
      sortedBiomes.forEach(biome => {
        const sets = armorByBiome.get(biome.id) || [];
        if (sets.length === 0) return;

        const isUnlocked = showAll || openBiomes.has(biome.id);
        const biomeCard = el('section', 'biome-card');
        biomeCard.dataset.biomeId = biome.id;

        const headerBtn = el('button', 'biome-header');
        headerBtn.type = 'button';
        headerBtn.id = 'biome-header-' + biome.id;
        headerBtn.setAttribute('aria-controls', 'biome-content-' + biome.id);
        headerBtn.setAttribute('aria-expanded', String(isUnlocked));

        if (biome.image) {
          headerBtn.style.backgroundImage = 'url("' + biome.image + '")';
        }

        const headerContent = el('div', 'biome-header-content');
        const orderBadge = el('span', 'biome-order-badge', 'Biome ' + biome.order);
        const nameHeading = el('span', 'biome-name', biome.name);
        const countBadge = el('span', 'biome-count-badge', sets.length + (sets.length === 1 ? ' set' : ' sets'));

        headerContent.appendChild(orderBadge);
        headerContent.appendChild(nameHeading);
        headerContent.appendChild(countBadge);

        const chevron = el('span', 'biome-chevron', '▼');
        chevron.setAttribute('aria-hidden', 'true');

        headerBtn.appendChild(headerContent);
        headerBtn.appendChild(chevron);

        const contentWrapper = el('div', 'biome-content-wrapper');
        contentWrapper.id = 'biome-content-' + biome.id;
        contentWrapper.setAttribute('role', 'region');
        contentWrapper.setAttribute('aria-labelledby', 'biome-header-' + biome.id);

        if (!isUnlocked) {
          contentWrapper.setAttribute('inert', '');
          headerBtn.setAttribute('aria-expanded', 'false');

          // Locked spoiler notice
          const lockedBanner = el('div', 'biome-locked-banner');
          const lockedText = el('div', 'locked-text');
          const lockIcon = el('span', 'locked-icon', '🔒');
          const lockMsg = el('span', null, 'Biome ' + biome.order + ' — open it in the Bestiary or reveal here');
          lockedText.appendChild(lockIcon);
          lockedText.appendChild(lockMsg);

          const revealBtn = el('button', 'action-btn action-btn-primary', 'Reveal');
          revealBtn.type = 'button';
          revealBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const current = new Set(getStoredOpenBiomes());
            current.add(biome.id);
            setStoredOpenBiomes(Array.from(current));
            renderCatalog();
          });

          lockedBanner.appendChild(lockedText);
          lockedBanner.appendChild(revealBtn);
          biomeCard.appendChild(headerBtn);
          biomeCard.appendChild(lockedBanner);
        } else {
          // Accordion toggle
          headerBtn.addEventListener('click', function () {
            const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
            const nextState = !isExpanded;
            headerBtn.setAttribute('aria-expanded', String(nextState));
            if (nextState) {
              contentWrapper.removeAttribute('inert');
            } else {
              contentWrapper.setAttribute('inert', '');
            }
          });

          // Render sets in this biome
          sets.forEach(armor => {
            const setCard = renderSetCard(armor);
            contentWrapper.appendChild(setCard);
          });

          biomeCard.appendChild(headerBtn);
          biomeCard.appendChild(contentWrapper);
        }

        biomesContainer.appendChild(biomeCard);
      });

      // Render Cosmetics section (collapsed by default)
      if (cosmetics.length > 0) {
        const cosmeticCard = el('section', 'biome-card');
        const headerBtn = el('button', 'biome-header');
        headerBtn.type = 'button';
        headerBtn.id = 'cosmetics-header';
        headerBtn.setAttribute('aria-controls', 'cosmetics-content');
        headerBtn.setAttribute('aria-expanded', 'false');

        const headerContent = el('div', 'biome-header-content');
        const badge = el('span', 'biome-order-badge', 'Special');
        const nameHeading = el('span', 'biome-name', 'Cosmetics');
        const countBadge = el('span', 'biome-count-badge', cosmetics.length + ' items');

        headerContent.appendChild(badge);
        headerContent.appendChild(nameHeading);
        headerContent.appendChild(countBadge);

        const chevron = el('span', 'biome-chevron', '▼');
        chevron.setAttribute('aria-hidden', 'true');

        headerBtn.appendChild(headerContent);
        headerBtn.appendChild(chevron);

        const contentWrapper = el('div', 'biome-content-wrapper');
        contentWrapper.id = 'cosmetics-content';
        contentWrapper.setAttribute('role', 'region');
        contentWrapper.setAttribute('aria-labelledby', 'cosmetics-header');
        contentWrapper.setAttribute('inert', '');

        headerBtn.addEventListener('click', function () {
          const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
          const nextState = !isExpanded;
          headerBtn.setAttribute('aria-expanded', String(nextState));
          if (nextState) {
            contentWrapper.removeAttribute('inert');
          } else {
            contentWrapper.setAttribute('inert', '');
          }
        });

        cosmetics.forEach(armor => {
          const setCard = renderSetCard(armor);
          contentWrapper.appendChild(setCard);
        });

        cosmeticCard.appendChild(headerBtn);
        cosmeticCard.appendChild(contentWrapper);
        cosmeticsContainer.appendChild(cosmeticCard);
      }
    }

    /**
     * Render Set Card
     */
    function renderSetCard(armor) {
      const card = el('div', 'set-card');
      card.dataset.armorId = armor.id;

      const summary = el('div', 'set-summary');

      // Left: piece icons + title + badges
      const summaryLeft = el('div', 'set-summary-left');

      const iconsRow = el('div', 'piece-icons-row');
      armor.pieces.forEach(p => {
        if (p.image) {
          const img = el('img', 'piece-icon-img');
          img.src = p.image;
          img.alt = p.name;
          img.loading = 'lazy';
          iconsRow.appendChild(img);
        }
      });
      summaryLeft.appendChild(iconsRow);

      const infoCol = el('div', 'set-summary-info');
      const titleRow = el('div', 'set-title-row');
      const title = el('h3', 'set-title', armor.name);
      titleRow.appendChild(title);

      const badgesRow = el('div', 'set-badges-row');

      // Armor badge (q1 -> max)
      const { q1, max } = calculateTotalArmor(armor.pieces);
      const armorBadgeText = q1 === max ? 'Armor: ' + q1 : 'Armor: ' + q1 + ' → ' + max;
      const armorBadge = el('span', 'badge badge-armor', armorBadgeText);
      badgesRow.appendChild(armorBadge);

      // Set bonus chip
      if (armor.setBonus) {
        const bonusText = armor.setBonus.name;
        const bonusBadge = el('span', 'badge badge-bonus', bonusText);
        badgesRow.appendChild(bonusBadge);
      }

      infoCol.appendChild(titleRow);
      infoCol.appendChild(badgesRow);
      summaryLeft.appendChild(infoCol);

      // Right: Add set button + details toggle button
      const summaryRight = el('div', 'set-summary-right');

      const addSetBtn = el('button', 'action-btn action-btn-primary', 'Add set');
      addSetBtn.type = 'button';
      addSetBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        // Handled in Step 3 / cart integration
        const evt = new CustomEvent('va:add-set', { detail: { armor } });
        window.dispatchEvent(evt);
      });

      const toggleDetailsBtn = el('button', 'set-detail-toggle-btn', 'Details ▾');
      toggleDetailsBtn.type = 'button';

      summaryRight.appendChild(addSetBtn);
      summaryRight.appendChild(toggleDetailsBtn);

      summary.appendChild(summaryLeft);
      summary.appendChild(summaryRight);

      // Detail container (expanded in Step 2)
      const detailContainer = el('div', 'set-detail');
      detailContainer.setAttribute('inert', '');

      function toggleDetails() {
        const isOpen = !detailContainer.hasAttribute('inert');
        if (isOpen) {
          detailContainer.setAttribute('inert', '');
          toggleDetailsBtn.textContent = 'Details ▾';
        } else {
          detailContainer.removeAttribute('inert');
          toggleDetailsBtn.textContent = 'Details ▴';
          // Dispatch event or call renderSetDetail in Step 2
          const evt = new CustomEvent('va:open-detail', { detail: { armor, container: detailContainer } });
          window.dispatchEvent(evt);
        }
      }

      summary.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        toggleDetails();
      });

      toggleDetailsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDetails();
      });

      card.appendChild(summary);
      card.appendChild(detailContainer);

      return card;
    }

    renderCatalog();
  }

  function buildFooter(footer, data) {
    if (!footer) return;
    footer.textContent = '';

    const p1 = el('p');
    p1.appendChild(document.createTextNode('Data: '));

    const wikiA = el('a', null, 'Valheim Wiki (valheim.weirdgloop.org)');
    wikiA.href = 'https://valheim.weirdgloop.org';
    wikiA.target = '_blank';
    wikiA.rel = 'noopener noreferrer';
    p1.appendChild(wikiA);

    p1.appendChild(document.createTextNode(', CC BY-SA 4.0 · generated '));

    const genDate = data && data.generatedAt ? data.generatedAt.slice(0, 10) : '2026-10-06';
    p1.appendChild(document.createTextNode(genDate));
    footer.appendChild(p1);

    const p2 = el('p', null, 'Fan project, not affiliated with Iron Gate.');
    footer.appendChild(p2);
  }

  // Auto-init on DOMContentLoaded if in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initArmourer);
    } else {
      initArmourer();
    }
  }

  return {
    calculateTotalArmor,
    getStoredOpenBiomes,
    setStoredOpenBiomes,
    getStoredShowAll,
    setStoredShowAll,
    getStoredCart,
    setStoredCart,
    getStoredBreakdown,
    setStoredBreakdown
  };
});
