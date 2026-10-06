import type { Translate } from '../../../../shared/i18n/core';

/** Translated UI prose with English game names supplied as values (VC-29). */
export interface GameText {
  source: string;
  values: Record<string, string>;
}

export function gameText(source: string, values: Record<string, string>): GameText {
  return { source, values };
}

export function formatGameText(text: GameText, t: Translate): string {
  return t(text.source, text.values);
}
