// Assembles the final site into dist/ for deployment or preview.
// Follows VC-4 architecture:
//   dist/                  <- apps/hub/*
//   dist/bestiary/         <- apps/bestiary/{index.html, assets, data/data.js, img}
//   dist/signs/            <- apps/signs/dist-static/*
//   dist/damage-calculator/ <- apps/damage-calculator/dist-static/*

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { buildI18n } from './build-i18n.mjs';
import { buildSearchIndex } from './build-search-index.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const HUB_DIR = path.join(REPO_ROOT, 'apps', 'hub');
const BESTIARY_DIR = path.join(REPO_ROOT, 'apps', 'bestiary');
const ARMOURER_DIR = path.join(REPO_ROOT, 'apps', 'smithy');
const SHARED_I18N_DIR = path.join(REPO_ROOT, 'shared', 'i18n');
const SHARED_ANALYTICS_DIR = path.join(REPO_ROOT, 'shared', 'analytics');
const SIGNS_DIST = path.join(REPO_ROOT, 'apps', 'signs', 'dist-static');
const DAMAGE_DIST = path.join(REPO_ROOT, 'apps', 'damage-calculator', 'dist-static');

/** Generate the browser/Node module from the canonical typed player core. */
export function buildPlayer() {
  const require = createRequire(path.join(REPO_ROOT, 'apps', 'damage-calculator', 'package.json'));
  const ts = require('typescript');
  const source = readFileSync(path.join(REPO_ROOT, 'shared', 'player', 'core.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const generated = '// Generated from core.ts by scripts/build-site.mjs — DO NOT EDIT MANUALLY.\n' + output;
  writeFileSync(path.join(REPO_ROOT, 'shared', 'player', 'core.js'), generated);
  return generated;
}

export function buildSite() {
  if (!existsSync(SIGNS_DIST)) {
    console.error('Error: apps/signs/dist-static does not exist.');
    console.error('Please build Runopis first: npm --prefix apps/signs run build');
    process.exit(1);
  }

  if (!existsSync(DAMAGE_DIST)) {
    console.error('Error: apps/damage-calculator/dist-static does not exist.');
    console.error(
      'Please build the Damage Calculator first: npm --prefix apps/damage-calculator run build',
    );
    process.exit(1);
  }

  buildPlayer();
  buildI18n();
  buildSearchIndex();

  console.log('assembling dist/…');
  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });

  // 1. apps/hub/* -> dist/
  cpSync(HUB_DIR, DIST_DIR, { recursive: true });

  // Clean up template files from dist/og so only *.png remain
  const distOgDir = path.join(DIST_DIR, 'og');
  if (existsSync(distOgDir)) {
    for (const file of readdirSync(distOgDir)) {
      if (!file.endsWith('.png')) {
        rmSync(path.join(distOgDir, file), { recursive: true, force: true });
      }
    }
  }

  // 2. apps/bestiary/{index.html, assets, data/data.js, img} -> dist/bestiary/
  const bestiaryDist = path.join(DIST_DIR, 'bestiary');
  mkdirSync(bestiaryDist, { recursive: true });
  mkdirSync(path.join(bestiaryDist, 'data'), { recursive: true });

  cpSync(path.join(BESTIARY_DIR, 'index.html'), path.join(bestiaryDist, 'index.html'));
  cpSync(path.join(BESTIARY_DIR, 'assets'), path.join(bestiaryDist, 'assets'), { recursive: true });
  cpSync(path.join(BESTIARY_DIR, 'data', 'data.js'), path.join(bestiaryDist, 'data', 'data.js'));
  cpSync(path.join(BESTIARY_DIR, 'img'), path.join(bestiaryDist, 'img'), { recursive: true });

  // 3. apps/smithy/{index.html, assets, data/data.js, img} -> dist/smithy/
  const armourerDist = path.join(DIST_DIR, 'smithy');
  mkdirSync(armourerDist, { recursive: true });
  mkdirSync(path.join(armourerDist, 'data'), { recursive: true });

  cpSync(path.join(ARMOURER_DIR, 'index.html'), path.join(armourerDist, 'index.html'));
  cpSync(path.join(ARMOURER_DIR, 'assets'), path.join(armourerDist, 'assets'), { recursive: true });
  cpSync(path.join(ARMOURER_DIR, 'data', 'data.js'), path.join(armourerDist, 'data', 'data.js'));
  cpSync(path.join(ARMOURER_DIR, 'img'), path.join(armourerDist, 'img'), { recursive: true });

  // 4. apps/signs/dist-static/* -> dist/signs/
  const signsDistTarget = path.join(DIST_DIR, 'signs');
  mkdirSync(signsDistTarget, { recursive: true });
  cpSync(SIGNS_DIST, signsDistTarget, { recursive: true });

  // 4. apps/damage-calculator/dist-static/* -> dist/damage-calculator/
  const damageDistTarget = path.join(DIST_DIR, 'damage-calculator');
  mkdirSync(damageDistTarget, { recursive: true });
  cpSync(DAMAGE_DIST, damageDistTarget, { recursive: true });

  // 5. shared/i18n/*.js -> dist/shared/i18n/
  const sharedDistTarget = path.join(DIST_DIR, 'shared', 'i18n');
  mkdirSync(sharedDistTarget, { recursive: true });
  if (existsSync(SHARED_I18N_DIR)) {
    for (const file of readdirSync(SHARED_I18N_DIR)) {
      if (file.endsWith('.js')) {
        cpSync(path.join(SHARED_I18N_DIR, file), path.join(sharedDistTarget, file));
      }
    }
  }

  // 6. shared/analytics/* -> dist/shared/analytics/
  const sharedAnalyticsDistTarget = path.join(DIST_DIR, 'shared', 'analytics');
  mkdirSync(sharedAnalyticsDistTarget, { recursive: true });
  if (existsSync(SHARED_ANALYTICS_DIR)) {
    cpSync(SHARED_ANALYTICS_DIR, sharedAnalyticsDistTarget, { recursive: true });
  }

  // Shared player profile used by the Bestiary modules.
  const playerDist = path.join(DIST_DIR, 'shared', 'player');
  mkdirSync(playerDist, { recursive: true });
  cpSync(path.join(REPO_ROOT, 'shared', 'player', 'core.js'), path.join(playerDist, 'core.js'));

  console.log('done: site assembled in dist/');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildSite();
}
