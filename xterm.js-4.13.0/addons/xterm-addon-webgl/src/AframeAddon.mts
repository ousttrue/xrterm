/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { Terminal, ITerminalAddon } from 'xterm';
import { AframeRenderer } from './AframeRenderer.mjs';
import { IRenderService } from 'browser/services/Services.mjs'; // '../xterm.js'; // if you use ""noImplicitAny": false" in tsconfig.json
import { IColorSet } from 'browser/Types.mjs';
import { AFrame } from 'aframe';

export class AframeAddon implements ITerminalAddon {
  private _terminal?: Terminal;
  private _renderer?: AframeRenderer;
  private _size?: any;

  constructor(private _gl_three: any) {
    console.log("construct addon");
  }

  public activate(terminal: Terminal): void {
    if (!terminal.element) {
      throw new Error('Cannot activate AframeAddon before Terminal.open');
    }

    this._terminal = terminal;
    const renderService: IRenderService = (<any>terminal)._core._renderService;
    const colors: IColorSet = (<any>terminal)._core._colorManager.colors;
    this._renderer = new AframeRenderer(terminal, colors, this._gl_three);
    this._size = new AFRAME.THREE.Vector3(this._renderer.dimensions.scaledCanvasWidth, this._renderer.dimensions.scaledCanvasHeight, 0);
  }

  public dispose(): void {
    if (!this._terminal) {
      throw new Error('Cannot dispose WebglAddon because it is activated');
    }
    const renderService: IRenderService = (this._terminal as any)._core._renderService;
    renderService.setRenderer((this._terminal as any)._core._createRenderer());
    renderService.onResize(this._terminal.cols, this._terminal.rows);
    this._renderer = undefined;
  }

  public get textureAtlas(): HTMLCanvasElement | undefined {
    return this._renderer?.textureAtlas;
  }

  public get bufferGeometry(): any {
    return this._renderer?.bufferGeometry;
  }

  public get shaderMaterial(): any {
    return this._renderer?.shaderMaterial;
  }

  public get canvasSize(): any {
    return this._size;
  }

  public clearTextureAtlas(): void {
    this._renderer?.clearCharAtlas();
  }

  public tick(): void {
    this._renderer?.updateRows(0, 24);
  }
}
