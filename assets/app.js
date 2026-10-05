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
   * Safe image creator with lazy loading and placeholder fallback
   * @param {string|null} src
   * @param {string} alt
   * @param {string} className
   * @param {string} placeholderChar
   * @returns {HTMLElement}
   */
  function createImage(src, alt, className, placeholderChar) {
    if (!src) {
      const ph = el('div', className + ' image-placeholder', placeholderChar || alt.charAt(0) || '?');
      ph.setAttribute('aria-label', alt);
      return ph;
    }
    const img = document.createElement('img');
    img.className = className;
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('error', function () {
      const parent = img.parentElement;
      if (parent) {
        const ph = el('div', className + ' image-placeholder', placeholderChar || alt.charAt(0) || '?');
        ph.setAttribute('aria-label', alt);
        parent.replaceChild(ph, img);
      }
    });
    return img;
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
