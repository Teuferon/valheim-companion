import type { Translate } from './i18n.ts';

export const templateCategories = [
  'Chest labels',
  'Portal tags',
  'Paths & directions',
  'Welcome & base',
  'Fun',
] as const;

export type SignTemplate = {
  id: string;
  category: (typeof templateCategories)[number];
  name: string;
  color: string;
  text: string;
  translateText?: boolean;
  prefix?: string;
};

// Resource and biome names stay in English for signs placed in the game.
// Trailing closing tags are optional in Runopis's compact rich-text format.
export const signTemplates: readonly SignTemplate[] = [
  {
    id: 'wood',
    category: 'Chest labels',
    name: 'Timber',
    color: '#A9C89F',
    text: 'Wood / Fine wood',
    prefix: '<#AC9><b>',
  },
  {
    id: 'stone',
    category: 'Chest labels',
    name: 'Building stone',
    color: '#FFFFFF',
    text: 'Stone / Flint',
    prefix: '<#FFF><b>',
  },
  {
    id: 'forest-ores',
    category: 'Chest labels',
    name: 'Early ores',
    color: '#E5BA58',
    text: 'Copper ore / Tin ore',
    prefix: '<#EB5><b>',
  },
  {
    id: 'swamp-ore',
    category: 'Chest labels',
    name: 'Scrap storage',
    color: '#EB8D77',
    text: 'Scrap iron',
    prefix: '<#E87><b>',
  },
  {
    id: 'silver',
    category: 'Chest labels',
    name: 'Mountain ore',
    color: '#90C9E3',
    text: 'Silver ore',
    prefix: '<#9CE><b>',
  },
  {
    id: 'black-metal',
    category: 'Chest labels',
    name: 'Plains metal',
    color: '#A9C89F',
    text: 'Black metal',
    prefix: '<#AC9><b>',
  },
  {
    id: 'flametal',
    category: 'Chest labels',
    name: 'Ashlands metal',
    color: '#EB8D77',
    text: 'Flametal',
    prefix: '<#E87><b>',
  },
  {
    id: 'food',
    category: 'Chest labels',
    name: 'Food storage',
    color: '#E5BA58',
    text: 'Food / Mead',
    prefix: '<#EB5><b>',
  },
  {
    id: 'seeds',
    category: 'Chest labels',
    name: 'Garden supplies',
    color: '#A9C89F',
    text: 'Seeds / Barley / Flax',
    prefix: '<#AC9><b>',
  },
  {
    id: 'metals',
    category: 'Chest labels',
    name: 'Metal ingots',
    color: '#FFFFFF',
    text: 'Bronze / Iron / Silver',
    prefix: '<#FFF><b>',
  },
  {
    id: 'portal-home',
    category: 'Portal tags',
    name: 'Home portal',
    color: '#90C9E3',
    text: 'Home',
    translateText: true,
    prefix: '<#9CE><b>',
  },
  {
    id: 'portal-swamp',
    category: 'Portal tags',
    name: 'Swamp portal',
    color: '#A9C89F',
    text: 'Swamp',
    prefix: '<#AC9><b>',
  },
  {
    id: 'portal-mistlands',
    category: 'Portal tags',
    name: 'Mistlands portal',
    color: '#C4A4DE',
    text: 'Mistlands',
    prefix: '<#CAD><b>',
  },
  {
    id: 'path-home',
    category: 'Paths & directions',
    name: 'Way home',
    color: '#E5BA58',
    text: 'Home',
    translateText: true,
    prefix: '<#EB5>← ',
  },
  {
    id: 'path-harbor',
    category: 'Paths & directions',
    name: 'Way to the harbor',
    color: '#90C9E3',
    text: 'Harbor',
    translateText: true,
    prefix: '<#9CE>→ ',
  },
  {
    id: 'path-mine',
    category: 'Paths & directions',
    name: 'Way to the mine',
    color: '#FFFFFF',
    text: 'Mine',
    translateText: true,
    prefix: '<#FFF>↑ ',
  },
  {
    id: 'welcome',
    category: 'Welcome & base',
    name: 'Welcome sign',
    color: '#E5BA58',
    text: 'Welcome home',
    translateText: true,
    prefix: '<#EB5><b>',
  },
  {
    id: 'camp',
    category: 'Welcome & base',
    name: 'Camp sign',
    color: '#A9C89F',
    text: 'Base camp',
    translateText: true,
    prefix: '<#AC9><b>',
  },
  {
    id: 'warning',
    category: 'Welcome & base',
    name: 'Warning sign',
    color: '#EB8D77',
    text: 'Beware!',
    translateText: true,
    prefix: '<#E87><b>',
  },
  {
    id: 'trolls',
    category: 'Fun',
    name: 'Keep trolls away',
    color: '#EB8D77',
    text: 'No trolls',
    translateText: true,
    prefix: '<#E87><b>',
  },
  {
    id: 'fishing',
    category: 'Fun',
    name: 'Fishing break',
    color: '#90C9E3',
    text: 'Gone fishing',
    translateText: true,
    prefix: '<#9CE><i>',
  },
  {
    id: 'bees',
    category: 'Fun',
    name: 'Happy bees',
    color: '#E5BA58',
    text: 'Happy bees',
    translateText: true,
    prefix: '<#EB5><b>',
  },
];

export function templateText(template: SignTemplate, t: Translate): string {
  return (
    (template.prefix ?? '') +
    (template.translateText ? t(template.text) : template.text)
  );
}
