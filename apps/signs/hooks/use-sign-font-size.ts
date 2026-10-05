'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import { fitSignFontSize, fitSignContentScale } from '@/lib/sign-layout';
import type { PreviewRun } from '@/lib/rich-text';

/** Fit the rendered rich text, including fallback glyphs and explicit sizes. */
export function useSignFontSize(
  scene: RefObject<HTMLDivElement | null>,
  content: RefObject<HTMLDivElement | null>,
  runs: PreviewRun[],
) {
  const [layout, setLayout] = useState({ fontSize: 0, scale: 1 });
  useLayoutEffect(() => {
    const element = scene.current;
    const text = content.current;
    if (!element || !text) return;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    let disposed = false;
    const measure = () => {
      if (disposed || element.clientWidth <= 0) return;
      context.font = '400 100px Norse, sans-serif';
      const capital = context.measureText('H');
      const fontSize = fitSignFontSize({
        sceneWidth: element.clientWidth,
        longestLineWidthAt100: 0,
        capHeightAt100:
          capital.actualBoundingBoxAscent + capital.actualBoundingBoxDescent ||
          70,
        lineCount: 1,
      });
      // Measure the same DOM as the preview, at its natural, unwrapped size.
      // Scaling the entire result also shrinks <size=...px> and inline symbols.
      const probe = text.cloneNode(true) as HTMLDivElement;
      Object.assign(probe.style, {
        position: 'absolute',
        visibility: 'hidden',
        pointerEvents: 'none',
        transform: 'none',
        fontSize: `${fontSize}px`,
      });
      probe.setAttribute('aria-hidden', 'true');
      text.parentElement!.appendChild(probe);
      let scale: number;
      try {
        const bounds = probe.getBoundingClientRect();
        scale = fitSignContentScale({
          sceneWidth: element.clientWidth,
          contentWidth: bounds.width,
          contentHeight: bounds.height,
        });
      } finally {
        probe.remove();
      }
      setLayout((previous) =>
        previous.fontSize === fontSize && previous.scale === scale
          ? previous
          : { fontSize, scale },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    void Promise.all([
      document.fonts.load('400 100px Norse'),
      document.fonts.load('700 100px Norse'),
    ])
      .then(measure)
      .catch(() => {});
    document.fonts.addEventListener('loadingdone', measure);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
    };
  }, [scene, content, runs]);
  return layout;
}
