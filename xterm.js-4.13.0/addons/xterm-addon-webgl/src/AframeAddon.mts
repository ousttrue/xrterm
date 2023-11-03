/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { Terminal, ITerminalAddon } from 'xterm';
import { IColorSet } from 'browser/Types.mjs';
import { AframeRenderer } from './AframeRenderer.mjs';

export class AframeAddon implements ITerminalAddon {
  private _renderer?: AframeRenderer;
  public get Renderer() { return this._renderer!; }

  constructor() {
  }

  public activate(terminal: Terminal): void {
    if (!terminal.element) {
      throw new Error('Cannot activate AframeAddon before Terminal.open');
    }

    const colors: IColorSet = (terminal as any)._core._colorManager.colors;
    this._renderer = new AframeRenderer(terminal, colors);
  }

  public dispose(): void {
    if (this._renderer) {
      this._renderer.dispose();
    }
    this._renderer = undefined;
  }
}
