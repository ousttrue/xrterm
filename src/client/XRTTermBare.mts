/// @ts-check
import XRTTty from './XRTTty.mjs';
import { AframeAddon } from '../../xterm.js-4.13.0/addons/xterm-addon-webgl/src/AframeAddon.mjs';
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
const DEFAULT_BG_COLOR = 0x333333;
const FOCUSED_OPACITY = 0.8;
const UNFOCUSED_OPACITY = 0.4;
const THREE = AFRAME.THREE;

const INDICES_PER_CELL = 12;

class TermObject {
  bg_material: THREE.Material;
  bg_mesh: THREE.Mesh;
  glyph_mesh: THREE.Mesh;
  glyph_texture: THREE.CanvasTexture;

  // from a-frame variables
  private _aframebuffergeometry: THREE.BufferGeometry;
  private _aframe_pos_att: THREE.BufferAttribute;
  private _aframe_uv_att: THREE.BufferAttribute;

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
  private _term: any;

  constructor(aframeaddon: AframeAddon, color: any) {
    this._term = aframeaddon._renderer._terminal;
    // create BG material and mesh
    const { width, height } = aframeaddon.Renderer!.canvasSize;
    const geometry = new THREE.PlaneGeometry(
      width * 0.044,
      height * 0.044, 8, 8);
    this.bg_material = new THREE.MeshBasicMaterial({
      color: DEFAULT_BG_COLOR,
      side: THREE.FrontSide,
      opacity: 1,
      transparent: true
    });
    this.bg_mesh = new THREE.Mesh(geometry, this.bg_material)

    const glyph = aframeaddon._renderer._glyphRenderer;

    // create FG material and mesh
    this._aframebuffergeometry = new AFRAME.THREE.BufferGeometry();
    this._aframe_pos_att = new AFRAME.THREE.BufferAttribute(glyph.positions, 3);
    this._aframe_uv_att = new AFRAME.THREE.BufferAttribute(glyph.uvs, 2);
    this._aframe_pos_att.usage = AFRAME.THREE.DynamicDrawUsage;
    this._aframe_uv_att.usage = AFRAME.THREE.DynamicDrawUsage;
    this._aframebuffergeometry.setAttribute('position', this._aframe_pos_att);
    this._aframebuffergeometry.setAttribute('uv', this._aframe_uv_att);
    this._aframebuffergeometry.dynamic = true;
    this._aframebuffergeometry.attributes.position.needsUpdate = true;
    this._aframebuffergeometry.attributes.uv.needsUpdate = true;
    this._aframebuffergeometry.setIndex(new AFRAME.THREE.BufferAttribute(glyph.idx, 1));
    this._aframebuffergeometry.index.needsUpdate = true;
    this.glyph_texture = new THREE.CanvasTexture(aframeaddon.Renderer!.textureAtlas!);
    this.glyph_texture.needsUpdate = true;
    this.glyph_mesh = new THREE.Mesh(
      this._aframebuffergeometry,
      new THREE.MeshBasicMaterial({
        map: this.glyph_texture,
        color,
        transparent: true
      }));
  }

  resize() {
    const { rows, cols } = this._term;
    const newCount = cols * rows * INDICES_PER_CELL;
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
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          this._vertices.attributes[i + 8] = x / cols; //XXX
          this._vertices.attributes[i + 9] = y / rows;
          i += INDICES_PER_CELL;
        }
      }
    }
  }

}

export default class XRTTermBare {
  termObject: TermObject

  constructor(component: typeof AFRAME.AComponent) {
    // @ts-ignore
    const tty = (component.el.components['xrtty'].impl) as XRTTty;
    const aframeaddon = tty.aframeaddon;
    const { width, height } = aframeaddon.Renderer!.canvasSize;
    console.log(width, height);

    this.termObject = new TermObject(aframeaddon, component.data.color);

    component.el.setObject3D('mesh', this.termObject.bg_mesh);

    // @ts-ignore
    component.el.addEventListener('raycaster-intersected', (_) => {
      this.termObject.bg_material.opacity = FOCUSED_OPACITY;
    });
    // @ts-ignore
    component.el.addEventListener('raycaster-intersected-cleared', (_) => {
      this.termObject.bg_material.opacity = UNFOCUSED_OPACITY;
    });

    const el_term_ = document.createElement('a-entity');
    el_term_.setObject3D('mesh', this.termObject.glyph_mesh);
    el_term_.object3D.position.set(
      -width * 0.022,
      height * 0.022,
      0.1);
    component.el.appendChild(el_term_);

    tty.term.onRender(() => {
      this.termObject.glyph_texture.needsUpdate = true;
    });
  }

  tick() {
    this.termObject._aframebuffergeometry.attributes.position.needsUpdate = true;
    this.termObject._aframebuffergeometry.attributes.uv.needsUpdate = true;
    this.termObject._aframebuffergeometry.index.needsUpdate = true;
    this.termObject.resize();
  }
}

console.log('AFRAME.registerComponent', 'term-bare');
AFRAME.registerComponent('term-bare', {
  dependencies: ['xrtty'],
  schema: {
    color: { default: '#ffffff' }
  },

  /**
  * @this {AFRAME.AComponent & {impl: XRTTermBare}}
  */
  init: function() {
    // @ts-ignore
    this.impl = new XRTTermBare(this);
  },
  tick() {
    // @ts-ignore
    this.impl.tick();
  }
});
