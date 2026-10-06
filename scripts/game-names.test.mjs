import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculator, staticApp, Element } from './lib/render-apps.mjs';

const read = path => readFileSync(path, 'utf8');
const languages = JSON.parse(read('shared/i18n/languages.json'));

for (const { code } of languages) {
  test(`VC-29: English names rendered in Bestiary, Armourer and calculator (${code})`, () => {
    const bestiary = staticApp('bestiary', code);
    const { data, context: b } = bestiary;
    const creature = data.creatures.greydwarf;
    const biome = data.biomes.find(biome => biome.id === 'black-forest');
    const card = b.renderers.createCreatureCard(creature, biome, data);
    assert.equal(card.querySelector('.card-name').textContent, 'Greydwarf');
    assert.equal(card.dataset.creatureName, 'greydwarf');
    for (const entity of Object.values(data.creatures)) {
      assert.equal(b.VCI18n.name(entity), entity.name);
      const biome = data.biomes.find(biome => entity.biomes.includes(biome.id));
      assert.equal(b.renderers.createCreatureCard(entity, biome, data).querySelector('.card-name').textContent, entity.name);
    }
    for (const weapon of Object.values(data.weapons)) {
      const row = b.renderers.createWeaponRowBtn(weapon.id, null, [], null, data);
      assert.equal(row.querySelector('.weapon-btn-name').textContent, weapon.name);
    }
    for (const biome of data.biomes) assert.equal(b.renderers.biomeName(biome), biome.name);
    const weapon = Object.values(data.weapons).find(weapon => weapon.materials?.length && data.biomes.some(b => b.id === weapon.biome));
    b.renderers.openWeaponModal(weapon, data);
    const modal = bestiary.document.getElementById('weapon-modal-content');
    assert.equal(modal.querySelector('.modal-title').textContent, weapon.name);
    for (const material of weapon.materials) assert.ok(modal.textContent.includes(material.name), material.name);
    assert.ok(modal.textContent.includes(data.biomes.find(b => b.id === weapon.biome).name));
    assert.equal(b.renderers.normalizeSearch('  NÍDHÖGG  '.trim()), 'nidhogg');

    const armourer = staticApp('smithy', code);
    const { context: a, data: armorData } = armourer;
    a.renderers.renderCatalog();
    const headings = armourer.nodes.get('biomes-container').querySelectorAll('.biome-name').map(node => node.textContent);
    for (const biome of armorData.biomes.filter(biome => armorData.armor.some(armor => armor.biome === biome.id))) assert.ok(headings.includes(biome.name), biome.name);
    for (const armor of armorData.armor) {
      assert.equal(a.renderers.renderSetCard(armor).querySelector('.set-title').textContent, armor.name);
      const detail = new Element('div');
      a.renderers.renderSetDetail(armor, detail, armorData);
      for (const piece of armor.pieces) assert.ok(detail.textContent.includes(piece.name), piece.name);
    }
    for (const weapon of Object.values(armorData.weapons)) assert.equal(a.renderers.renderWeaponCard(weapon).querySelector('.set-title').textContent, weapon.name);
    const trollSet = armorData.armor.find(armor => armor.id === 'troll-set');
    const cart = trollSet.pieces.map(piece => ({ pieceId: piece.id, have: 0, want: 1 }));
    const calculation = a.VACart.calculateCartMaterials(cart, armorData, { openBiomes: ['black-forest'] });
    for (const material of calculation.materials) assert.equal(material.name, armorData.items[material.item].name);
    assert.ok(calculation.materials.find(m => m.item === 'bone-fragments').sources[0].text.includes('Skeleton (Black Forest)'));
    const locked = a.VACart.calculateCartMaterials(cart, armorData, {});
    assert.ok(locked.materials.find(m => m.item === 'bone-fragments').sources[0].text.includes('Black Forest'));
    assert.ok(calculation.materials.length > 0);
    const bonusDetail = new Element('div');
    const bonusArmor = Object.assign(Object.create(trollSet), { setBonus: { name: 'Game Bonus', pieces: 2, effects: ['+10% pierce damage'] } });
    a.renderers.renderSetDetail(bonusArmor, bonusDetail, armorData);
    assert.ok(bonusDetail.textContent.includes('Pierce'));
    a.renderers.setCart(cart);
    a.renderers.renderCart();
    const renderedMaterials = [...armourer.nodes.values()].flatMap(node => node.querySelectorAll('.material-name')).map(node => node.textContent);
    for (const material of calculation.materials) assert.ok(renderedMaterials.includes(material.name), material.name);

    const calc = calculator(code);
    const { targets, weapons, recipes } = calc.load('apps/damage-calculator/src/lib/data.ts');
    const { BIOMES } = calc.load('apps/damage-calculator/src/data/biomes.ts');
    const { TargetPicker } = calc.load('apps/damage-calculator/src/components/target-picker.tsx');
    const { BiomeSlider } = calc.load('apps/damage-calculator/src/components/biome-slider.tsx');
    const { GuidePickRow } = calc.load('apps/damage-calculator/src/components/progression-guide.tsx');
    const { buildGuideStep } = calc.load('apps/damage-calculator/src/lib/guide.ts');
    const markup = calc.render(TargetPicker, { targets, total: targets.length, selected: targets[0], onSelect() {} });
    assert.ok(markup.includes('Greydwarf'));
    assert.ok(!markup.includes('Šedý trpaslík'));
    for (const target of targets) assert.equal(calc.names.localizedName(target, code), target.name);
    for (const weapon of weapons) assert.equal(calc.names.localizedName(weapon, code), weapon.name);
    for (const biome of BIOMES) {
      const html = calc.render(BiomeSlider, { value: biome.id, onChange() {}, visibleWeapons: 1, totalWeapons: 1, visibleTargets: 1, totalTargets: 1 });
      assert.ok(html.includes(biome.name), biome.name);
      for (const value of Object.values(biome.note.values)) assert.ok(html.includes(value), value);
      for (const pick of buildGuideStep(biome.id).picks) {
        const html = calc.render(GuidePickRow, { pick, gateName: 'Greydwarf' });
        assert.ok(html.includes(pick.weapon.name), pick.weapon.name);
        for (const material of pick.craft) assert.ok(html.includes(material.name), material.name);
        if (pick.locked) for (const material of pick.locked.materials) assert.ok(html.includes(material.name), material.name);
      }
    }
    const { GUIDE_NOTES } = calc.load('apps/damage-calculator/src/data/guide-notes.ts');
    const { formatGameText } = calc.load('apps/damage-calculator/src/lib/game-text.ts');
    const catalog = JSON.parse(read('apps/damage-calculator/src/locales/messages.json'));
    for (const note of Object.values(GUIDE_NOTES).flat()) {
      const rendered = formatGameText(note, (source, values) => calc.core.translate(code, source, catalog, values));
      for (const value of Object.values(note.values)) assert.ok(rendered.includes(value), value);
    }
    const { MethodologySections } = calc.load('apps/damage-calculator/src/components/assumptions.tsx');
    const methodology = calc.render(MethodologySections, {});
    for (const name of ['Stone Axe', 'Barka', 'Deep North', 'Abyssal Harpoon', 'Flesh Rippers', 'Dundr']) assert.ok(methodology.includes(name), name);
    assert.ok(Object.keys(recipes).length > 0);
    assert.equal(calc.names.matchesName({ name: 'Nidhögg' }, 'NIDHOGG', code), true);
    assert.equal(calc.names.matchesName({ name: 'Greydwarf' }, 'Šedý trpaslík', code), false);
    assert.equal(calc.core.entityName({ name: 'Greydwarf', names: { [code]: 'Translated name' } }, code), 'Greydwarf');
  });
}

test('VC-29: catalogs cannot translate game names and UI cannot consume names.json', () => {
  const terms = ['Meadows', 'Black Forest', 'Ocean', 'Swamp', 'Mountain', 'Plains', 'Mistlands', 'Ashlands', 'Deep North', 'Slash', 'Pierce', 'Blunt', 'Fire', 'Frost', 'Lightning', 'Poison', 'Spirit', 'Chop', 'Pickaxe', 'Pure'];
  for (const path of ['apps/bestiary/locales/messages.json', 'apps/smithy/locales/messages.json', 'apps/damage-calculator/src/locales/messages.json']) {
    const catalog = JSON.parse(read(path));
    for (const term of terms) assert.equal(catalog[term], undefined, `${path}: ${term}`);
  }
  assert.ok(!read('apps/damage-calculator/src/lib/entity-names.ts').includes('names.json'));
});
