#!/bin/bash
# Rebuild the Saga artwork from the existing local game images.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p apps/progress/img/biomes apps/progress/img/bosses
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
node --input-type=module > "$scratch/images.tsv" <<'JS'
import fs from 'node:fs';
import vm from 'node:vm';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('apps/progress/data/data.js', 'utf8'), context);
for (const biome of context.window.VP_DATA.biomes) {
  for (const [suffix, width] of [['', 480], ['-s', 96]]) {
    console.log([`apps/bestiary/img/biomes/${biome.id}.png`, `apps/progress/img/biomes/${biome.id}${suffix}.webp`, width].join('\t'));
  }
  for (const boss of [...biome.bosses, ...biome.minibosses]) {
    if (!boss.image) throw new Error(`Missing source portrait: ${boss.id}`);
    console.log([`apps/progress/${boss.image}`, `apps/progress/img/bosses/${boss.id}.webp`, 128].join('\t'));
  }
}
JS
while IFS=$'\t' read -r source output width; do
  sips --resampleWidth "$width" "$source" --out "$scratch/resized.png" >/dev/null
  cwebp -quiet -q 72 "$scratch/resized.png" -o "$output"
done < "$scratch/images.tsv"
node --input-type=module <<'JS'
import fs from 'node:fs';
const sum = files => files.reduce((n, file) => n + fs.statSync(file).size, 0);
const biomes = fs.readdirSync('apps/progress/img/biomes').map(x => 'apps/progress/img/biomes/' + x);
const bosses = fs.readdirSync('apps/progress/img/bosses').map(x => 'apps/progress/img/bosses/' + x);
const small = sum([...biomes.filter(x => x.endsWith('-s.webp')), ...bosses]);
const large = sum(biomes.filter(x => !x.endsWith('-s.webp')));
console.log(`Drawer images: ${small} bytes; full artwork: ${large} bytes.`);
if (small > 250000 || large > 500000) process.exit(1);
JS
