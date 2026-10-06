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

      // Detail container
      const detailContainer = el('div', 'set-detail');
      detailContainer.setAttribute('inert', '');
      let detailRendered = false;

      function toggleDetails() {
        const isOpen = !detailContainer.hasAttribute('inert');
        if (isOpen) {
          detailContainer.setAttribute('inert', '');
          toggleDetailsBtn.textContent = 'Details ▾';
        } else {
          if (!detailRendered) {
            renderSetDetail(armor, detailContainer, data);
            detailRendered = true;
          }
          detailContainer.removeAttribute('inert');
          toggleDetailsBtn.textContent = 'Details ▴';
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

    /**
     * Render Set Detail (Pieces table, Upgrade costs, Set bonus)
     */
    function renderSetDetail(armor, container, data) {
      container.textContent = '';

      // --- 1. Pieces Table Section ---
      const tableSection = el('div', 'detail-pieces-section');
      const tableHeaderBar = el('div', 'table-header-bar');
      const tableTitle = el('h4', 'detail-section-title', 'Pieces & Stats');

      // Level switcher
      const switcher = el('div', 'level-switcher');
      const switcherLabel = el('span', 'level-switcher-label', 'Show level:');
      switcher.appendChild(switcherLabel);

      const levelPills = ['All', 'Q1', 'Q2', 'Q3', 'Q4'];
      const pillBtns = [];

      tableHeaderBar.appendChild(tableTitle);
      tableHeaderBar.appendChild(switcher);
      tableSection.appendChild(tableHeaderBar);

      // Table scroll wrapper for mobile 360px
      const tableWrapper = el('div', 'table-scroll-wrapper');
      const table = el('table', 'pieces-table');
      const thead = el('thead');
      const headerTr = el('tr');

      const thPiece = el('th', null, 'Piece');
      const thSlot = el('th', null, 'Slot');
      const thQ1 = el('th', 'th-quality', 'Q1');
      thQ1.dataset.quality = '1';
      const thQ2 = el('th', 'th-quality', 'Q2');
      thQ2.dataset.quality = '2';
      const thQ3 = el('th', 'th-quality', 'Q3');
      thQ3.dataset.quality = '3';
      const thQ4 = el('th', 'th-quality', 'Q4');
      thQ4.dataset.quality = '4';
      const thWeight = el('th', null, 'Weight');
      const thSpeed = el('th', null, 'Speed');
      const thResist = el('th', null, 'Resistances');
      const thAction = el('th', null, 'Action');

      headerTr.appendChild(thPiece);
      headerTr.appendChild(thSlot);
      headerTr.appendChild(thQ1);
      headerTr.appendChild(thQ2);
      headerTr.appendChild(thQ3);
      headerTr.appendChild(thQ4);
      headerTr.appendChild(thWeight);
      headerTr.appendChild(thSpeed);
      headerTr.appendChild(thResist);
      headerTr.appendChild(thAction);
      thead.appendChild(headerTr);
      table.appendChild(thead);

      const tbody = el('tbody');
      const qualityTds = [];

      armor.pieces.forEach(piece => {
        const tr = el('tr');

        // Piece cell (icon + name)
        const tdPiece = el('td');
        const pieceCell = el('div', 'piece-cell-name');
        if (piece.image) {
          const thumb = el('img', 'piece-thumb');
          thumb.src = piece.image;
          thumb.alt = piece.name;
          thumb.loading = 'lazy';
          pieceCell.appendChild(thumb);
        }
        const nameText = el('span', 'piece-name-text', piece.name);
        pieceCell.appendChild(nameText);
        tdPiece.appendChild(pieceCell);

        // Slot cell
        const tdSlot = el('td');
        const slotBadge = el('span', 'badge badge-slot', piece.slot || 'gear');
        tdSlot.appendChild(slotBadge);

        // Quality 1-4 armor cells
        const qLevels = new Map();
        (piece.levels || []).forEach(l => qLevels.set(l.quality, l.armor));

        const tdQ1 = el('td', 'td-quality', qLevels.has(1) ? String(qLevels.get(1)) : '—');
        tdQ1.dataset.quality = '1';
        qualityTds.push(tdQ1);

        const tdQ2 = el('td', 'td-quality', qLevels.has(2) ? String(qLevels.get(2)) : '—');
        tdQ2.dataset.quality = '2';
        qualityTds.push(tdQ2);

        const tdQ3 = el('td', 'td-quality', qLevels.has(3) ? String(qLevels.get(3)) : '—');
        tdQ3.dataset.quality = '3';
        qualityTds.push(tdQ3);

        const tdQ4 = el('td', 'td-quality', qLevels.has(4) ? String(qLevels.get(4)) : '—');
        tdQ4.dataset.quality = '4';
        qualityTds.push(tdQ4);

        // Weight
        const tdWeight = el('td', null, piece.weight !== undefined && piece.weight !== null ? String(piece.weight) : '—');

        // Movement Speed
        const tdSpeed = el('td');
        if (piece.movementSpeed) {
          const prefix = piece.movementSpeed > 0 ? '+' : '';
          tdSpeed.textContent = prefix + piece.movementSpeed + '%';
        } else {
          tdSpeed.textContent = '0%';
        }

        // Resistances
        const tdResist = el('td');
        if (piece.resistances && piece.resistances.length > 0) {
          piece.resistances.forEach(res => {
            const resBadge = el('span', 'badge badge-source', res);
            tdResist.appendChild(resBadge);
          });
        } else {
          tdResist.textContent = '—';
        }

        // Add Piece Action
        const tdAction = el('td');
        const addPieceBtn = el('button', 'action-btn action-btn-sm', '+ Add piece');
        addPieceBtn.type = 'button';
        addPieceBtn.addEventListener('click', function () {
          const evt = new CustomEvent('va:add-piece', { detail: { piece, armor } });
          window.dispatchEvent(evt);
        });
        tdAction.appendChild(addPieceBtn);

        tr.appendChild(tdPiece);
        tr.appendChild(tdSlot);
        tr.appendChild(tdQ1);
        tr.appendChild(tdQ2);
        tr.appendChild(tdQ3);
        tr.appendChild(tdQ4);
        tr.appendChild(tdWeight);
        tr.appendChild(tdSpeed);
        tr.appendChild(tdResist);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      tableSection.appendChild(tableWrapper);
      container.appendChild(tableSection);

      // Level pill click handlers
      const qThs = [thQ1, thQ2, thQ3, thQ4];
      function setHighlightedQuality(selectedQ) {
        pillBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.level === selectedQ);
        });

        qThs.forEach(th => {
          th.classList.toggle('col-highlight', selectedQ !== 'all' && th.dataset.quality === selectedQ);
        });
        qualityTds.forEach(td => {
          td.classList.toggle('col-highlight', selectedQ !== 'all' && td.dataset.quality === selectedQ);
        });
      }

      levelPills.forEach(lvl => {
        const btn = el('button', 'level-pill-btn', lvl);
        btn.type = 'button';
        btn.dataset.level = lvl === 'All' ? 'all' : lvl.slice(1);
        if (lvl === 'All') btn.classList.add('active');

        btn.addEventListener('click', function () {
          setHighlightedQuality(btn.dataset.level);
        });

        pillBtns.push(btn);
        switcher.appendChild(btn);
      });

      // --- 2. Crafting & Upgrade Costs Section ---
      const costsSection = el('div', 'detail-costs-section');
      const costsTitle = el('h4', 'detail-section-title', 'Crafting & Upgrade Costs');
      costsSection.appendChild(costsTitle);

      const costsGrid = el('div', 'costs-grid');
      let hasAnyCost = false;

      armor.pieces.forEach(piece => {
        (piece.levels || []).forEach(lvl => {
          if (!lvl.materials || lvl.materials.length === 0) return;
          hasAnyCost = true;

          const costCard = el('div', 'cost-card');
          const costHeader = el('div', 'cost-card-header');

          const pieceName = el('span', 'cost-piece-name', piece.name + ' · Q' + lvl.quality + (lvl.quality === 1 ? ' (Craft)' : ' (Upgrade)'));
          const stationName = piece.station || 'Station';
          const stationText = lvl.stationLevel ? stationName + ' lvl ' + lvl.stationLevel : stationName;
          const stationBadge = el('span', 'cost-station-badge', stationText);

          costHeader.appendChild(pieceName);
          costHeader.appendChild(stationBadge);
          costCard.appendChild(costHeader);

          const matsList = el('div', 'cost-materials-list');
          lvl.materials.forEach(mat => {
            const itemData = data.items && data.items[mat.item];
            const matPill = el('div', 'cost-mat-pill');

            if (itemData && itemData.image) {
              const icon = el('img', 'cost-mat-icon');
              icon.src = itemData.image;
              icon.alt = itemData.name || mat.item;
              icon.loading = 'lazy';
              matPill.appendChild(icon);
            }

            const label = el('span', null, mat.amount + '× ' + (itemData ? itemData.name : mat.item));
            matPill.appendChild(label);

            if (mat.fuel) {
              const fuelBadge = el('span', 'badge badge-fuel', 'fuel');
              matPill.appendChild(fuelBadge);
            }

            matsList.appendChild(matPill);
          });

          costCard.appendChild(matsList);
          costsGrid.appendChild(costCard);
        });
      });

      if (hasAnyCost) {
        costsSection.appendChild(costsGrid);
        container.appendChild(costsSection);
      } else {
        const noCostNotice = el('p', 'cart-empty-msg', 'No crafting recipes (obtained via merchant, quests or events).');
        costsSection.appendChild(noCostNotice);
        container.appendChild(costsSection);
      }

      // --- 3. Set Bonus Section ---
      if (armor.setBonus) {
        const bonusBox = el('div', 'set-bonus-box');
        const bonusHeader = el('div', 'set-bonus-title');
        const pieceWord = armor.setBonus.pieces === 1 ? 'piece' : 'pieces';
        bonusHeader.textContent = 'Set Bonus: ' + armor.setBonus.name + ' (' + armor.setBonus.pieces + ' ' + pieceWord + ')';
        bonusBox.appendChild(bonusHeader);

        if (armor.setBonus.effects && armor.setBonus.effects.length > 0) {
          const effectsUl = el('ul', 'set-bonus-effects');
          armor.setBonus.effects.forEach(eff => {
            const li = el('li', null, eff);
            effectsUl.appendChild(li);
          });
          bonusBox.appendChild(effectsUl);
        }

        container.appendChild(bonusBox);
      }

      // --- 4. Add Full Set Action ---
      const detailActions = el('div', 'controls-actions');
      const addFullSetBtn = el('button', 'action-btn action-btn-primary', 'Add full set to shopping list');
      addFullSetBtn.type = 'button';
      addFullSetBtn.addEventListener('click', function () {
        const evt = new CustomEvent('va:add-set', { detail: { armor } });
        window.dispatchEvent(evt);
      });
      detailActions.appendChild(addFullSetBtn);
      container.appendChild(detailActions);
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
