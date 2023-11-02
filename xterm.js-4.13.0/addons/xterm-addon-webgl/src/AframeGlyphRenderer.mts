/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { throwIfFalsy } from './WebglUtils.mjs';
import { WebglCharAtlas } from './atlas/WebglCharAtlas.mjs';
import { IWebGL2RenderingContext, IWebGLVertexArrayObject, IRenderModel, IRasterizedGlyph } from './Types.mjs';
import { COMBINED_CHAR_BIT_MASK, RENDER_MODEL_INDICIES_PER_CELL, RENDER_MODEL_FG_OFFSET, RENDER_MODEL_BG_OFFSET } from './RenderModel.mjs';
import { fill } from 'common/TypedArrayUtils.mjs';
import { slice } from './TypedArray.mjs';
import { NULL_CELL_CODE, WHITESPACE_CELL_CODE, Attributes, FgFlags } from 'common/buffer/Constants.mjs';
import { Terminal, IBufferLine } from 'xterm';
import { IColorSet, IColor } from 'browser/Types.mjs';
import { IRenderDimensions } from 'browser/renderer/Types.mjs';
import { AttributeData } from 'common/buffer/AttributeData.mjs';
import { AFrame } from 'aframe';

interface IVertices {
  attributes: Float32Array;
  pos_attributes: Float32Array;
  uv_attributes: Float32Array;
  norm_attributes: Float32Array;
  /**
   * These buffers are the ones used to bind to WebGL, the reason there are
   * multiple is to allow double buffering to work as you cannot modify the
   * buffer while it's being used by the GPU. Having multiple lets us start
   * working on the next frame.
   */
  attributesBuffers: Float32Array[];
  selectionAttributes: Float32Array;
  count: number;
}
const INDICES_PER_CELL = 12;
const CELL_POSITION_INDICES = 2;
const ARRAY_SIZE = 24000;

export class AframeGlyphRenderer {
  private _atlas: WebglCharAtlas | undefined;

  public _atlasTexture: WebGLTexture;
  private _activeBuffer: number = 0;

  // from a-frame variables
  private _aframebuffergeometry: any;
  private _aframe_pos_att: any;
  private _aframe_uv_att: any;
  private _aframeshadermaterial: any;

  private _vertices: IVertices = {
    count: 0,
    attributes: new Float32Array(0),

    pos_attributes: new Float32Array(8),//(10000),
    uv_attributes: new Float32Array(8),//(10000),
    norm_attributes: new Float32Array(8),//(10000),

    attributesBuffers: [
      new Float32Array(8),
      new Float32Array(8)
    ],
    selectionAttributes: new Float32Array(0)
  };

  private vertices: any;
  private numVertices: any;
  private positionNumComponents: any;
  private uvNumComponents: any;
  private positions: any;
  private uvs: any;
  private idx: any;
  private posNdx: any;
  private uvNdx: any;

  constructor(
    private _terminal: Terminal,
    private _colors: IColorSet,
    private _gl: IWebGL2RenderingContext,
    private _dimensions: IRenderDimensions) {
    const gl = this._gl;

    this.positions = new Float32Array(ARRAY_SIZE);
    this.uvs = new Float32Array(ARRAY_SIZE);
    this.idx = new Uint32Array(ARRAY_SIZE);
    console.log('positions buffernum: ', this.positions.buffer.byteLength);
    console.log('uvs buffernum: ', this.uvs.buffer.byteLength);

    // Setup empty texture atlas
    this._atlasTexture = throwIfFalsy(gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D, this._atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this._aframebuffergeometry = new AFRAME.THREE.BufferGeometry();

    this._aframe_pos_att = new AFRAME.THREE.BufferAttribute(this.positions, 3);
    this._aframe_uv_att = new AFRAME.THREE.BufferAttribute(this.uvs, 2);
    this._aframe_pos_att.usage = AFRAME.THREE.DynamicDrawUsage;
    this._aframe_uv_att.usage = AFRAME.THREE.DynamicDrawUsage;

    this._aframebuffergeometry.setAttribute('position', this._aframe_pos_att);
    this._aframebuffergeometry.setAttribute('uv', this._aframe_uv_att);
    this._aframebuffergeometry.dynamic = true;
    this._aframebuffergeometry.attributes.position.needsUpdate = true;
    this._aframebuffergeometry.attributes.uv.needsUpdate = true;

    // for (let i in this.idx) { this.idx[i] = i; }

    this._aframebuffergeometry.setIndex(new AFRAME.THREE.BufferAttribute(this.idx, 1));
    this._aframebuffergeometry.index.needsUpdate = true;

    // Set viewport
    this.onResize();
  }

  public updateCell(x: number, y: number, code: number, bg: number, fg: number, chars: string): void {
    this._updateCell(this.positions, this.uvs, this.idx, x, y, code, bg, fg, chars);
    this._aframebuffergeometry.attributes.position.needsUpdate = true;
    this._aframebuffergeometry.attributes.uv.needsUpdate = true;
    this._aframebuffergeometry.index.needsUpdate = true;
  }

  public debug(): void {
    // console.log(this._vertices.pos_attributes);
  }

  private _updateCell(pos_array_: Float32Array, uv_array_: Float32Array, idx_array_: Uint32Array,
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

    let fn_scale = this._dimensions.scaledCharHeight / this._dimensions.scaledCanvasHeight;
    let v_spc = y_ / terminal.rows * this._dimensions.scaledCharHeight;
    let h_spc = x_ * this._dimensions.scaledCanvasHeight / this._dimensions.scaledCanvasWidth / 2;

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

  private get_pos(array_: Float32Array, offset_: number) {
    return "(" + array_[offset_].toFixed(2) + ", " + array_[offset_ + 1].toFixed(2) + ", " + array_[offset_ + 2].toFixed(2) + ")";
  }

  public updateAtlas(): void {
    /*
       // Bind the texture atlas if it's changed
       if (this._atlas.hasCanvasChanged) {
         this._atlas.hasCanvasChanged = false;
         // gl.uniform1i(this._textureLocation, 0);
         gl.activeTexture(gl.TEXTURE0 + 0);
         gl.bindTexture(gl.TEXTURE_2D, this._atlasTexture);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._atlas.cacheCanvas);
         gl.generateMipmap(gl.TEXTURE_2D);
         }
         */
  }

  private _getColorFromAnsiIndex(idx: number): IColor {
    if (idx >= this._colors.ansi.length) {
      throw new Error('No color found for idx ' + idx);
    }
    return this._colors.ansi[idx];
  }

  public onResize(): void {
    const terminal = this._terminal;

    // Update vertices
    const newCount = terminal.cols * terminal.rows * INDICES_PER_CELL;
    if (this._vertices.count !== newCount) {
      this._vertices.count = newCount;
      this._vertices.attributes = new Float32Array(newCount);

      console.log('new count = ', newCount);

      // Aframe
      this._vertices.pos_attributes = new Float32Array(newCount * 3);
      this._vertices.uv_attributes = new Float32Array(newCount * 2);

      for (let i = 0; i < this._vertices.attributesBuffers.length; i++) {
        this._vertices.attributesBuffers[i] = new Float32Array(newCount);
      }

      let i = 0;
      for (let y = 0; y < terminal.rows; y++) {
        for (let x = 0; x < terminal.cols; x++) {
          this._vertices.attributes[i + 8] = x / terminal.cols; //XXX
          this._vertices.attributes[i + 9] = y / terminal.rows;
          i += INDICES_PER_CELL;
        }
      }
    }
  }

  public render(renderModel: IRenderModel, isSelectionVisible: boolean): void {
    /*
        if (!this._atlas) { return; }
    
        const gl = this._gl;
    
        // Alternate buffers each frame as the active buffer gets locked while it's in use by the GPU
        this._activeBuffer = (this._activeBuffer + 1) % 2;
        const activeBuffer = this._vertices.attributesBuffers[this._activeBuffer];
    
        // Copy data for each cell of each line up to its line length (the last non-whitespace cell)
        // from the attributes buffer into activeBuffer, which is the one that gets bound to the GPU.
        // The reasons for this are as follows:
        // - So the active buffer can be alternated so we don't get blocked on rendering finishing
        // - To copy either the normal attributes buffer or the selection attributes buffer when there
        //   is a selection
        // - So we don't send vertices for all the line-ending whitespace to the GPU
        let bufferLength = 0;
        for (let y = 0; y < renderModel.lineLengths.length; y++)
        {
          const si = y * this._terminal.cols * INDICES_PER_CELL;
          const sub = (isSelectionVisible ? this._vertices.selectionAttributes : this._vertices.attributes).subarray(si, si + renderModel.lineLengths[y] * INDICES_PER_CELL);
          activeBuffer.set(sub, bufferLength);
          bufferLength += sub.length;
        }
    
        // Bind the texture atlas if it's changed
        if (this._atlas.hasCanvasChanged) {
          this._atlas.hasCanvasChanged = false;
          // gl.uniform1i(this._textureLocation, 0);
          gl.activeTexture(gl.TEXTURE0 + 0);
          gl.bindTexture(gl.TEXTURE_2D, this._atlasTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._atlas.cacheCanvas);
          gl.generateMipmap(gl.TEXTURE_2D);
        }
    
        // Draw the viewport
        gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0, bufferLength / INDICES_PER_CELL);
    */
  }

  public setAtlas(atlas: WebglCharAtlas): void {
    const gl = this._gl;
    this._atlas = atlas;

    gl.bindTexture(gl.TEXTURE_2D, this._atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.cacheCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  public setDimensions(dimensions: IRenderDimensions): void {
    this._dimensions = dimensions;
  }

  public get getBufferGeometry(): any {
    return this._aframebuffergeometry;
  }

  public get shaderMaterial(): any {
    return this._aframeshadermaterial;
  }

  public get termIndex(): any {
    return this.idx;
  }

  public beginFrame(): boolean {
    return this._atlas ? this._atlas.beginFrame() : true;
  }

  public setColors(): void {
  }

  public updateSelection(model: IRenderModel): void {
    const terminal = this._terminal;

    this._vertices.selectionAttributes = slice(this._vertices.attributes, 0);

    const bg = (this._colors.selectionOpaque.rgba >>> 8) | Attributes.CM_RGB;

    if (model.selection.columnSelectMode) {
      const startCol = model.selection.startCol;
      const width = model.selection.endCol - startCol;
      const height = model.selection.viewportCappedEndRow - model.selection.viewportCappedStartRow + 1;
      for (let y = model.selection.viewportCappedStartRow; y < model.selection.viewportCappedStartRow + height; y++) {
        this._updateSelectionRange(startCol, startCol + width, y, model, bg);
      }
    } else {
      // Draw first row
      const startCol = model.selection.viewportStartRow === model.selection.viewportCappedStartRow ? model.selection.startCol : 0;
      const startRowEndCol = model.selection.viewportCappedStartRow === model.selection.viewportCappedEndRow ? model.selection.endCol : terminal.cols;
      this._updateSelectionRange(startCol, startRowEndCol, model.selection.viewportCappedStartRow, model, bg);

      // Draw middle rows
      const middleRowsCount = Math.max(model.selection.viewportCappedEndRow - model.selection.viewportCappedStartRow - 1, 0);
      for (let y = model.selection.viewportCappedStartRow + 1; y <= model.selection.viewportCappedStartRow + middleRowsCount; y++) {
        this._updateSelectionRange(0, startRowEndCol, y, model, bg);
      }

      // Draw final row
      if (model.selection.viewportCappedStartRow !== model.selection.viewportCappedEndRow) {
        // Only draw viewportEndRow if it's not the same as viewportStartRow
        const endCol = model.selection.viewportEndRow === model.selection.viewportCappedEndRow ? model.selection.endCol : terminal.cols;
        this._updateSelectionRange(0, endCol, model.selection.viewportCappedEndRow, model, bg);
      }
    }
  }

  private _updateSelectionRange(startCol: number, endCol: number, y: number, model: IRenderModel, bg: number): void {
    const terminal = this._terminal;
    const row = y + terminal.buffer.active.viewportY;
    let line: IBufferLine | undefined;
    for (let x = startCol; x < endCol; x++) {
      const offset = (y * this._terminal.cols + x) * RENDER_MODEL_INDICIES_PER_CELL;
      const code = model.cells[offset];
      let fg = model.cells[offset + RENDER_MODEL_FG_OFFSET];
      if (fg & FgFlags.INVERSE) {
        const workCell = new AttributeData();
        workCell.fg = fg;
        workCell.bg = model.cells[offset + RENDER_MODEL_BG_OFFSET];
        // Get attributes from fg (excluding inverse) and resolve inverse by pullibng rgb colors
        // from bg. This is needed since the inverse fg color should be based on the original bg
        // color, not on the selection color
        fg = (fg & ~(Attributes.CM_MASK | Attributes.RGB_MASK | FgFlags.INVERSE));
        switch (workCell.getBgColorMode()) {
          case Attributes.CM_P16:
          case Attributes.CM_P256:
            const c = this._getColorFromAnsiIndex(workCell.getBgColor()).rgba;
            fg |= (c >> 8) & Attributes.RED_MASK | (c >> 8) & Attributes.GREEN_MASK | (c >> 8) & Attributes.BLUE_MASK;
          case Attributes.CM_RGB:
            const arr = AttributeData.toColorRGB(workCell.getBgColor());
            fg |= arr[0] << Attributes.RED_SHIFT | arr[1] << Attributes.GREEN_SHIFT | arr[2] << Attributes.BLUE_SHIFT;
          case Attributes.CM_DEFAULT:
          default:
            const c2 = this._colors.background.rgba;
            fg |= (c2 >> 8) & Attributes.RED_MASK | (c2 >> 8) & Attributes.GREEN_MASK | (c2 >> 8) & Attributes.BLUE_MASK;
        }
        fg |= Attributes.CM_RGB;
      }
      if (code & COMBINED_CHAR_BIT_MASK) {
        if (!line) {
          line = terminal.buffer.active.getLine(row);
        }
        const chars = line!.getCell(x)!.getChars();
        // Aframe
        //        this._updateCell(this._vertices.selectionAttributes, x, y, model.cells[offset], bg, fg, chars);
      } else {
        // Aframe
        //        this._updateCell(this._vertices.selectionAttributes, x, y, model.cells[offset], bg, fg);
      }
    }
  }

}
