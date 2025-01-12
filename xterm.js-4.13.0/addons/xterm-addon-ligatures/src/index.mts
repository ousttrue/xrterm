/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { Terminal } from 'xterm';
import { Font } from 'font-ligatures.mjs';

import load from './font.mjs';

const enum LoadingState {
  UNLOADED,
  LOADING,
  LOADED,
  FAILED
}

// Caches 100K characters worth of ligatures. In practice this works out to
// about 650 KB worth of cache, when a moderate number of ligatures are present.
const CACHE_SIZE = 100000;

/**
 * Enable ligature support for the provided Terminal instance. To function
 * properly, this must be called after `open()` is called on the therminal. If
 * the font currently in use supports ligatures, the terminal will automatically
 * start to render them.
 * @param term Terminal instance from xterm.js
 */
export function enableLigatures(term: Terminal): void {
  let currentFontName: string | undefined = undefined;
  let font: Font | undefined = undefined;
  let loadingState: LoadingState = LoadingState.UNLOADED;
  let loadError: any | undefined = undefined;

  term.registerCharacterJoiner((text: string): [number, number][] => {
    // If the font hasn't been loaded yet, load it and return an empty result
    const termFont = term.getOption('fontFamily');
    if (
      termFont &&
      (loadingState === LoadingState.UNLOADED || currentFontName !== termFont)
    ) {
      font = undefined;
      loadingState = LoadingState.LOADING;
      currentFontName = termFont;
      const currentCallFontName = currentFontName;

      load(currentCallFontName, CACHE_SIZE)
        .then(f => {
          // Another request may have come in while we were waiting, so make
          // sure our font is still vaild.
          if (currentCallFontName === term.getOption('fontFamily')) {
            loadingState = LoadingState.LOADED;
            font = f;

            // Only refresh things if we actually found a font
            if (f) {
              term.refresh(0, term.getOption('rows') - 1);
            }
          }
        })
        .catch(e => {
          // Another request may have come in while we were waiting, so make
          // sure our font is still vaild.
          if (currentCallFontName === term.getOption('fontFamily')) {
            loadingState = LoadingState.FAILED;
            font = undefined;
            loadError = e;
          }
        });
    }

    if (font && loadingState === LoadingState.LOADED) {
      // We clone the entries to avoid the internal cache of the ligature finder
      // getting messed up.
      return font.findLigatureRanges(text).map<[number, number]>(
        range => [range[0], range[1]]
      );
    }
    if (loadingState === LoadingState.FAILED) {
      throw loadError || new Error('Failure while loading font');
    }

    return [];
  });
}
