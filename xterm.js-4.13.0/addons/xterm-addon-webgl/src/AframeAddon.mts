/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { Terminal, ITerminalAddon } from 'xterm';
import { IColorSet } from 'browser/Types.mjs';
import { AframeRenderer } from './AframeRenderer.mjs';

export class AframeAddon implements ITerminalAddon {
  private _renderer?: AframeRenderer;
  public get Renderer() { return this._renderer; }

  constructor(private _gl_three: any) {
  }

  public activate(terminal: Terminal): void {
    if (!terminal.element) {
      throw new Error('Cannot activate AframeAddon before Terminal.open');
    }

    const colors: IColorSet = (terminal as any)._core._colorManager.colors;
    this._renderer = new AframeRenderer(terminal, colors, this._gl_three);
  }

  public dispose(): void {
    this._renderer = undefined;
  }
}
