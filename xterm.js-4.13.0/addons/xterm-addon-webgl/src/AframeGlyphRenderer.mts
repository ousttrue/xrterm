/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { WebglCharAtlas } from './atlas/WebglCharAtlas.mjs';
import { IWebGL2RenderingContext, IRenderModel, IRasterizedGlyph } from './Types.mjs';
import { fill } from 'common/TypedArrayUtils.mjs';
import { NULL_CELL_CODE, WHITESPACE_CELL_CODE } from 'common/buffer/Constants.mjs';
import { Terminal } from 'xterm';
import { IColorSet } from 'browser/Types.mjs';
import { IRenderDimensions } from 'browser/renderer/Types.mjs';

const INDICES_PER_CELL = 12;
const CELL_POSITION_INDICES = 2;
const ARRAY_SIZE = 24000;

export class AframeGlyphRenderer {
  private _atlas: WebglCharAtlas | undefined;

  private positions: Float32Array;
  private uvs: Float32Array;
  private idx: Uint32Array;

  constructor(
    private _terminal: Terminal,
    private _colors: IColorSet,
    private _gl: IWebGL2RenderingContext
  ) {
    this.positions = new Float32Array(ARRAY_SIZE);
    this.uvs = new Float32Array(ARRAY_SIZE);
    this.idx = new Uint32Array(ARRAY_SIZE);
    console.log('positions buffernum: ', this.positions.buffer.byteLength);
    console.log('uvs buffernum: ', this.uvs.buffer.byteLength);
  }

  public debug(): void {
    // console.log(this._vertices.pos_attributes);
  }

  public updateCell(dimensions: IRenderDimensions,
    x: number, y: number, code: number, bg: number, fg: number, chars: string): void {
    this._updateCell(dimensions, this.positions, this.uvs, this.idx, x, y, code, bg, fg, chars);
  }

  private _updateCell(dimensions: IRenderDimensions, pos_array_: Float32Array, uv_array_: Float32Array, idx_array_: Uint32Array,
    x_: number, y_: number, code_: number | undefined, bg_: number, fg_: number, chars?: string): void {
    const terminal = this._terminal;
    const offset = (y_ * terminal.cols + x_) * INDICES_PER_CELL;
    const uv_idx = (y_ * terminal.cols + x_) * 8;

    // Exit early if this is a null/space character
    if (code_ === NULL_CELL_CODE || code_ === WHITESPACE_CELL_CODE || code_ === undefined/* This is used for the right side of wide chars */) {
      // fill(array, 0, i, i + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      fill(pos_array_, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      fill(uv_array_, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      return;
    }

    let rasterizedGlyph: IRasterizedGlyph;
    if (!this._atlas) { return; }
    if (chars && chars.length > 1) { rasterizedGlyph = this._atlas.getRasterizedGlyphCombinedChar(chars, bg_, fg_); }
    else { rasterizedGlyph = this._atlas.getRasterizedGlyph(code_, bg_, fg_); }

    // Fill empty if no glyph was found
    if (!rasterizedGlyph) {
      // fill(array, 0, i, i + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      fill(pos_array_, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      fill(uv_array_, 0, offset, offset + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
      return;
    }

    let fn_scale = dimensions.scaledCharHeight / dimensions.scaledCanvasHeight;
    let v_spc = y_ / terminal.rows * dimensions.scaledCharHeight;
    let h_spc = x_ * dimensions.scaledCanvasHeight / dimensions.scaledCanvasWidth / 2;

    let top = fn_scale * (rasterizedGlyph.offset.y) - v_spc,
      bottom = fn_scale * (rasterizedGlyph.offset.y - rasterizedGlyph.size.y) - v_spc,
      left = fn_scale * (-rasterizedGlyph.offset.x) + h_spc,
      right = fn_scale * (-rasterizedGlyph.offset.x + rasterizedGlyph.size.x) + h_spc;

    // console.log('offset = ', offset);

    pos_array_.set(
      [
        left, top, 0,
        right, top, 0,
        left, bottom, 0,
        right, bottom, 0,
      ], offset);

    let idx_o = (y_ * terminal.cols + x_) * 4;
    idx_array_.set([idx_o + 2, idx_o + 1, idx_o,
    idx_o + 2, idx_o + 3, idx_o + 1],
      (y_ * terminal.cols + x_) * 6);

    let uv_top = 1.0 - rasterizedGlyph.texturePositionClipSpace.y;
    let uv_bottom = uv_top - rasterizedGlyph.sizeClipSpace.y;
    let uv_left = rasterizedGlyph.texturePositionClipSpace.x;
    let uv_right = uv_left + rasterizedGlyph.sizeClipSpace.x;

    uv_array_.set(
      [
        uv_left, uv_top,
        uv_right, uv_top,
        uv_left, uv_bottom,
        uv_right, uv_bottom,
      ], uv_idx);
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
