export type SignSettings = {
  color: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  align: string;
  offset: number;
  spacing: number;
  opacity: number;
};
export const defaults: SignSettings = {
  color: '',
  size: 100,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  align: 'center',
  offset: 0,
  spacing: 0,
  opacity: 100,
};
export function shortColor(color: string) {
  const hex = color.replace('#', '').toUpperCase();
  return /^(.)\1(.)\2(.)\3$/.test(hex)
    ? '#' + hex[0] + hex[2] + hex[4]
    : '#' + hex;
}
export function compileSign(text: string, s: SignSettings, compact = true) {
  if (!text) return '';
  const tags: [string, string][] = [];
  if (s.color)
    tags.push([
      compact ? `<${shortColor(s.color)}>` : `<color=${s.color}>`,
      '</color>',
    ]);
  if (s.size !== 100) tags.push([`<size=${s.size}%>`, '</size>']);
  for (const [key, tag] of [
    ['bold', 'b'],
    ['italic', 'i'],
    ['underline', 'u'],
    ['strike', 's'],
  ] as const)
    if (s[key]) tags.push([`<${tag}>`, `</${tag}>`]);
  if (s.align !== 'center') tags.push([`<align=${s.align}>`, '</align>']);
  if (s.offset) tags.push([`<voffset=${s.offset / 10}em>`, '</voffset>']);
  if (s.spacing) tags.push([`<cspace=${s.spacing / 10}em>`, '</cspace>']);
  if (s.opacity !== 100)
    tags.push([
      `<alpha=#${Math.round((s.opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}>`,
      '',
    ]);
  const output =
    tags.map((t) => t[0]).join('') +
    text +
    tags
      .toReversed()
      .map((t) => t[1])
      .join('');
  return compact ? optimize(output) : output;
}
export function optimize(source: string) {
  // Never rewrite literal text inside noparse, nor remove closures before visible text.
  return source
    .split(/(<noparse>[\s\S]*?<\/noparse>)/gi)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(
            /<color=["']?(#[\da-f]{6})["']?>/gi,
            (_, hex) => `<${shortColor(hex)}>`,
          ),
    )
    .join('')
    .replace(/(?:<\/(?:color|size|b|i|u|s|align|voffset|cspace)>)+$/gi, '');
}
export const countText = (source: string) => ({
  characters: Array.from(source).length,
  units: source.length,
  bytes: new TextEncoder().encode(source).length,
});
export type PreviewStyle = {
  color?: string;
  fontSize?: string;
  fontWeight?: number;
  fontStyle?: string;
  textDecoration?: string;
  opacity?: number;
  verticalAlign?: string;
  letterSpacing?: string;
  textTransform?: 'uppercase' | 'lowercase';
  fontVariant?: string;
  backgroundColor?: string;
  whiteSpace?: 'pre' | 'pre-wrap';
  display?: string;
  width?: string;
  transform?: string;
  lineHeight?: string;
  marginLeft?: string;
  fontFamily?: string;
};
export type PreviewRun = { text: string; style: PreviewStyle };
export type PreviewResult = {
  runs: PreviewRun[];
  warnings: string[];
  align: 'left' | 'center' | 'right' | 'justify';
};
const namedColors: Record<string, string> = {
  black: '#000',
  blue: '#00f',
  green: '#008000',
  orange: '#ffa500',
  purple: '#800080',
  red: '#f00',
  white: '#fff',
  yellow: '#ff0',
  cyan: '#0ff',
  magenta: '#f0f',
  lime: '#0f0',
  silver: '#c0c0c0',
  grey: '#808080',
  gray: '#808080',
  maroon: '#800000',
  navy: '#000080',
  olive: '#808000',
  teal: '#008080',
  lightblue: '#add8e6',
  brown: '#a52a2a',
};
const colorValue = (s: string) =>
  /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(s)
    ? s
    : namedColors[s.toLowerCase()];
const unitValue = (s: string) =>
  /^[+-]?(?:\d+\.?\d*|\.\d+)(?:px|em|%)?$/.test(s)
    ? /[a-z%]/.test(s)
      ? s
      : `${s}px`
    : undefined;
export function parseRichText(
  source: string,
  t: (source: string, values?: Record<string, string | number>) => string = (
    source,
    values = {},
  ) =>
    source.replace(/\{(\w+)\}/g, (match, key: string) =>
      String(values[key] ?? match),
    ),
): PreviewResult {
  const runs: PreviewRun[] = [],
    warnings = new Set<string>();
  const stacks = new Map<string, PreviewStyle[]>();
  const active = new Map<string, PreviewStyle>();
  let align: PreviewResult['align'] = 'center',
    literal = false;
  const style = () => {
    const merged = Object.assign({}, ...active.values()) as PreviewStyle;
    merged.textDecoration =
      [
        active.has('u') ? 'underline' : '',
        active.has('s') ? 'line-through' : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined;
    return merged;
  };
  const emit = (text: string) => {
    if (text) runs.push({ text, style: style() });
  };
  for (const token of source
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\v/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\r\n?/g, '\n')
    .split(/(<[^>]*>)/g)) {
    if (!token) continue;
    if (literal) {
      if (/^<\/noparse>$/i.test(token)) literal = false;
      else emit(token);
      continue;
    }
    if (!token.startsWith('<') || !token.endsWith('>')) {
      emit(token);
      continue;
    }
    if (/^<br\s*\/?>$/i.test(token)) {
      emit('\n');
      continue;
    }
    const match = token.match(
      /^<(\/)?([a-z-]+|#[\da-f]{3,8})(?:=(?:"([^"]*)"|'([^']*)'|([^>]*)))?>$/i,
    );
    if (!match) {
      warnings.add(t('Neznámá značka: {value}', { value: token }));
      emit(token);
      continue;
    }
    let name = match[2].toLowerCase();
    let value = match[3] ?? match[4] ?? match[5] ?? '';
    if (name.startsWith('#')) {
      value = name;
      name = 'color';
    }
    if (name === 'strikethrough') name = 's';
    if (name === 'allcaps') name = 'uppercase';
    if (match[1]) {
      const stack = stacks.get(name);
      if (stack?.length) {
        stack.pop();
        if (stack.length) active.set(name, stack[stack.length - 1]);
        else active.delete(name);
      }
      continue;
    }
    if (name === 'noparse') {
      literal = true;
      continue;
    }
    if (name === 'br') {
      emit('\n');
      continue;
    }
    const st: PreviewStyle = {};
    switch (name) {
      case 'b':
        st.fontWeight = 800;
        break;
      case 'i':
        st.fontStyle = 'italic';
        break;
      case 'u':
      case 's':
        break;
      case 'color': {
        const c = colorValue(value);
        if (!c) {
          warnings.add(t('Neplatná barva: {value}', { value }));
          continue;
        }
        st.color = c;
        break;
      }
      case 'size': {
        const u = unitValue(value);
        if (!u || parseFloat(value) <= 0) {
          warnings.add(t('Neplatná velikost: {value}', { value }));
          continue;
        }
        st.fontSize = value.endsWith('%')
          ? `${parseFloat(value) / 100}em`
          : /^[+-]/.test(value)
            ? `calc(1em + ${u})`
            : u;
        break;
      }
      case 'alpha':
        if (/^#[\da-f]{2}$/i.test(value))
          st.opacity = parseInt(value.slice(1), 16) / 255;
        else warnings.add(t('Průhlednost očekává zápis #00 až #FF.'));
        break;
      case 'align':
        if (['left', 'center', 'right', 'justify'].includes(value))
          align = value as PreviewResult['align'];
        else warnings.add(t('Nepodporované zarovnání: {value}', { value }));
        continue;
      case 'voffset':
        st.verticalAlign = unitValue(value);
        break;
      case 'cspace':
        st.letterSpacing = unitValue(value);
        break;
      case 'uppercase':
      case 'lowercase':
        st.textTransform = name;
        break;
      case 'smallcaps':
        st.fontVariant = 'small-caps';
        break;
      case 'sub':
      case 'sup':
        st.verticalAlign = name === 'sub' ? 'sub' : 'super';
        st.fontSize = '0.6em';
        break;
      case 'mark':
        st.backgroundColor = colorValue(value);
        break;
      case 'nobr':
        st.whiteSpace = 'pre';
        break;
      case 'rotate':
        if (/^[+-]?\d+(\.\d+)?$/.test(value))
          st.transform = `rotate(${-Number(value)}deg)`;
        break;
      case 'space':
        runs.push({
          text: '\u00a0',
          style: {
            ...style(),
            display: 'inline-block',
            width: unitValue(value),
          },
        });
        continue;
      case 'line-height':
        st.lineHeight = unitValue(value);
        break;
      case 'font-weight':
        if (/^[1-9]00$/.test(value)) st.fontWeight = Number(value);
        break;
      default:
        warnings.add(
          t('Značka {value} nemá věrný náhled; ověř ji ve hře.', {
            value: `<${name}>`,
          }),
        );
        continue;
    }
    const stack = stacks.get(name) ?? [];
    stack.push(st);
    stacks.set(name, stack);
    active.set(name, st);
  }
  return { runs, warnings: [...warnings], align };
}
export const templates = [
  {
    name: 'Domov',
    eyebrow: 'VÍTEJ, VIKINGU',
    text: 'VÍTEJ DOMA',
    color: '#EBC789',
    icon: 'home',
  },
  {
    name: 'Sklad',
    eyebrow: 'VŠE NA SVÉM MÍSTĚ',
    text: 'DŘEVO A KÁMEN',
    color: '#A9C89F',
    icon: 'box',
  },
  {
    name: 'Portál',
    eyebrow: 'ZA DALŠÍM DOBRODRUŽSTVÍM',
    text: '← ČERNÝ LES',
    color: '#90C9E3',
    icon: 'compass',
  },
  {
    name: 'Nebezpečí',
    eyebrow: 'TADY KONČÍ POHODA',
    text: 'POZOR! TROLL',
    color: '#EB8D77',
    icon: 'skull',
  },
];
export const tagGroups = [
  {
    name: 'Základní formátování',
    note: 'Běžně používané na cedulích. Podtržení a přeškrtnutí vychází z TMP.',
    tags: [
      ['color', 'Barva', '<color=red>'],
      ['size', 'Velikost', '<size=150%>'],
      ['b', 'Tučně', '<b>'],
      ['i', 'Kurzíva', '<i>'],
      ['u', 'Podtržení', '<u>'],
      ['s', 'Přeškrtnutí', '<s>'],
      ['br', 'Nový řádek', '<br>'],
    ],
  },
  {
    name: 'Pokročilé značky TMP',
    note: 'Podpora v enginu neznamená zaručenou podporu konkrétní cedule. Vyzkoušej ve hře.',
    tags: [
      ['alpha', 'Průhlednost', '<alpha=#80>'],
      ['align', 'Zarovnání', '<align=left>'],
      ['voffset', 'Výškový posun', '<voffset=1em>'],
      ['cspace', 'Rozestup znaků', '<cspace=0.1em>'],
      ['line-height', 'Řádkování', '<line-height=120%>'],
      ['rotate', 'Rotace znaků', '<rotate=15>'],
      ['uppercase', 'Velká písmena', '<uppercase>'],
      ['lowercase', 'Malá písmena', '<lowercase>'],
      ['smallcaps', 'Kapitálky', '<smallcaps>'],
      ['sub', 'Dolní index', '<sub>'],
      ['sup', 'Horní index', '<sup>'],
      ['mark', 'Zvýraznění', '<mark=#FFFF0040>'],
      ['nobr', 'Bez zalomení', '<nobr>'],
      ['noparse', 'Doslovný zápis', '<noparse>'],
      ['space', 'Vodorovná mezera', '<space=1em>'],
      ['pos', 'Pozice kurzoru', '<pos=10%>'],
      ['indent', 'Odsazení', '<indent=1em>'],
      ['line-indent', 'Odsazení řádku', '<line-indent=1em>'],
      ['margin', 'Okraje', '<margin=1em>'],
      ['mspace', 'Pevná šířka znaků', '<mspace=1em>'],
      ['width', 'Šířka textu', '<width=80%>'],
      ['font-weight', 'Tloušťka písma', '<font-weight=700>'],
    ],
  },
  {
    name: 'Závislé na nastavení hry',
    note: 'Vyžadují dostupné assety, styly nebo obsluhu ve hře. Editor jejich výsledek nesimuluje.',
    tags: [
      ['font', 'Asset písma', '<font="FontName">'],
      ['gradient', 'Preset přechodu', '<gradient="Preset">'],
      ['sprite', 'Obrázek z atlasu', '<sprite=0>'],
      ['style', 'Definovaný styl', '<style="StyleName">'],
      ['link', 'ID odkazu / mod', '<link=id>'],
      ['page', 'Stránkování', '<page>'],
    ],
  },
];
