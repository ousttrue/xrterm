/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { WebglCharAtlas } from './atlas/WebglCharAtlas.mjs';
import { IRenderModel, IRasterizedGlyph } from './Types.mjs';
import { fill } from 'common/TypedArrayUtils.mjs';
import { NULL_CELL_CODE, WHITESPACE_CELL_CODE } from 'common/buffer/Constants.mjs';
import { Terminal } from 'xterm';
import { IRenderDimensions } from 'browser/renderer/Types.mjs';

const INDICES_PER_CELL = 12;
const CELL_POSITION_INDICES = 2;
const ARRAY_SIZE = 24000;

export class AframeGlyphRenderer {
  private _atlas: WebglCharAtlas | undefined;
  public positions: Float32Array;
  public uvs: Float32Array;
  public idx: Uint32Array;

  constructor() {
    this.positions = new Float32Array(ARRAY_SIZE);
    this.uvs = new Float32Array(ARRAY_SIZE);
    this.idx = new Uint32Array(ARRAY_SIZE);
  }

  public updateCell(terminal: Terminal, dimensions: IRenderDimensions,
    x: number, y: number, code: number, bg: number, fg: number, chars: string): void {

    const offset = (y * terminal.cols + x) * INDICES_PER_CELL;
    const uv_idx = (y * terminal.cols + x) * 8;

    // Exit early if this is a null/space character
    if (code === NULL_CELL_CODE || code === WHITESPACE_CELL_CODE || code === undefined
      /* This is used for the right side of wide chars */) {
      fill(this.positions, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      fill(this.uvs, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      return;
    }

    let rasterizedGlyph: IRasterizedGlyph | undefined;
    if (this._atlas) {
      if (chars && chars.length > 1) {
        rasterizedGlyph = this._atlas.getRasterizedGlyphCombinedChar(chars, bg, fg);
      }
      else {
        rasterizedGlyph = this._atlas.getRasterizedGlyph(code, bg, fg);
      }
    }

    // Fill empty if no glyph was found
    if (!rasterizedGlyph) {
      fill(this.positions, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      fill(this.uvs, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      return;
    }

    const fn_scale = dimensions.scaledCharHeight / dimensions.scaledCanvasHeight;
    const v_spc = y / terminal.rows * dimensions.scaledCharHeight;
    const h_spc = x * dimensions.scaledCanvasHeight / dimensions.scaledCanvasWidth / 2;

    const top = fn_scale * (rasterizedGlyph.offset.y) - v_spc;
    const bottom = fn_scale * (rasterizedGlyph.offset.y - rasterizedGlyph.size.y) - v_spc;
    const left = fn_scale * (-rasterizedGlyph.offset.x) + h_spc;
    const right = fn_scale * (-rasterizedGlyph.offset.x + rasterizedGlyph.size.x) + h_spc;
    this.positions.set(
      [
        left, top, 0,
        right, top, 0,
        left, bottom, 0,
        right, bottom, 0,
      ], offset);

    const uv_top = 1.0 - rasterizedGlyph.texturePositionClipSpace.y;
    const uv_bottom = uv_top - rasterizedGlyph.sizeClipSpace.y;
    const uv_left = rasterizedGlyph.texturePositionClipSpace.x;
    const uv_right = uv_left + rasterizedGlyph.sizeClipSpace.x;
    this.uvs.set(
      [
        uv_left, uv_top,
        uv_right, uv_top,
        uv_left, uv_bottom,
        uv_right, uv_bottom,
      ], uv_idx);

    const idx_o = (y * terminal.cols + x) * 4;
    this.idx.set(
      [
        idx_o + 2, idx_o + 1, idx_o,
        idx_o + 2, idx_o + 3, idx_o + 1],
      (y * terminal.cols + x) * 6);
  }

  public setAtlas(atlas: WebglCharAtlas): void {
    console.log('setAtlas');
    this._atlas = atlas;
  }

  public beginFrame(): boolean {
    return this._atlas ? this._atlas.beginFrame() : true;
  }

  public setColors(): void {
  }

  public updateSelection(model: IRenderModel): void {
  }
}
