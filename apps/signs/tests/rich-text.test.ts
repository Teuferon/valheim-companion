import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileSign,
  defaults,
  shortColor,
  optimize,
  parseRichText,
  countText,
} from '../lib/rich-text.ts';

void test('compact output preserves exact colors and saves terminal closures', () => {
  assert.equal(shortColor('#aabbcc'), '#ABC');
  assert.equal(shortColor('#abcdef'), '#ABCDEF');
  assert.equal(
    compileSign('DOMOV', {
      ...defaults,
      color: '#ffffff',
      bold: true,
      size: 150,
    }),
    '<#FFF><size=150%><b>DOMOV',
  );
  assert.equal(
    compileSign('DOMOV', { ...defaults, color: '#ffffff', bold: true }, false),
    '<color=#ffffff><b>DOMOV</b></color>',
  );
});
void test('optimizing does not leak an inline style into following text', () => {
  const source = '<color=#FF0000><b>A</b>B</color>C';
  const optimized = optimize(source);
  assert.equal(optimized, '<#F00><b>A</b>B</color>C');
  assert.deepEqual(
    parseRichText(optimized).runs.map((r) => [
      r.text,
      r.style.color,
      r.style.fontWeight,
    ]),
    [
      ['A', '#f00', 800],
      ['B', '#f00', undefined],
      ['C', undefined, undefined],
    ],
  );
});
void test('nested scopes restore previous color and independent font attributes', () => {
  const { runs } = parseRichText('<color=red>A<b><color=blue>B</color>C</b>D');
  assert.deepEqual(
    runs.map((r) => [r.text, r.style.color, r.style.fontWeight]),
    [
      ['A', '#f00', undefined],
      ['B', '#00f', 800],
      ['C', '#f00', 800],
      ['D', '#f00', undefined],
    ],
  );
});
void test('Czech characters and astral symbols have separate byte and input counts', () => {
  assert.deepEqual(countText('Ř⚔😀'), { characters: 3, units: 4, bytes: 9 });
});
void test('line breaks and literal tags render as text, not executable markup', () => {
  assert.equal(
    parseRichText('A\\nB<br>C')
      .runs.map((r) => r.text)
      .join(''),
    'A\nB\nC',
  );
  const literal = parseRichText('<noparse><b>A</b></noparse>');
  assert.equal(literal.runs.map((r) => r.text).join(''), '<b>A</b>');
  assert.equal(literal.runs[0].style.fontWeight, undefined);
  assert.equal(
    optimize('<noparse><color=#FFFFFF></noparse>'),
    '<noparse><color=#FFFFFF></noparse>',
  );
  const unsafe = parseRichText('<img src=x onerror=alert(1)>HELLO');
  assert.ok(unsafe.warnings.length);
  assert.ok(unsafe.runs[0].text.includes('<img'));
});
void test('advanced controls compile and unsupported assets are clearly flagged', () => {
  const code = compileSign('X', {
    ...defaults,
    offset: 15,
    spacing: 2,
    opacity: 50,
  });
  assert.ok(code.includes('<voffset=1.5em><cspace=0.2em><alpha=#80>'));
  const { runs } = parseRichText(code);
  assert.equal(runs[0].style.verticalAlign, '1.5em');
  assert.equal(runs[0].style.letterSpacing, '0.2em');
  assert.ok(parseRichText('<font="Missing">X').warnings.length);
});

void test('line break spellings preserve rotation and subsequent text styles', () => {
  for (const separator of [
    '\\n',
    '<br>',
    '<br/>',
    '<br />',
    '<BR>',
    '\n',
    '\r\n',
    '\r',
  ]) {
    const preview = parseRichText(
      `<rotate=10><color=red>A${separator}B</color></rotate>C`,
    );
    assert.equal(preview.runs.map((run) => run.text).join(''), 'A\nBC');
    assert.equal(preview.warnings.length, 0);
    for (const run of preview.runs.slice(0, -1)) {
      assert.equal(run.style.transform, 'rotate(-10deg)');
      assert.equal(run.style.color, '#f00');
    }
    assert.equal(preview.runs.at(-1)?.style.transform, undefined);
  }
  assert.equal(
    parseRichText('<noparse>A<br />B</noparse>')
      .runs.map((run) => run.text)
      .join(''),
    'A<br />B',
  );
});
void test('underline and strike coexist and have independent closing scopes', () => {
  const { runs } = parseRichText('<u><s>A</u>B</s>C');
  assert.deepEqual(
    runs.map((r) => r.style.textDecoration),
    ['underline line-through', 'line-through', undefined],
  );
});

void test('empty sign does not produce formatting-only clipboard text', () => {
  assert.equal(compileSign('', defaults), '');
});
