/// @ts-check
import XRTTty from './XRTTty.mjs';
import { AframeRenderer } from '../../xterm.js-4.13.0/addons/xterm-addon-webgl/src/AframeRenderer.mjs';
const DEFAULT_BG_COLOR = 0x333333;
const FOCUSED_OPACITY = 0.8;
const UNFOCUSED_OPACITY = 0.4;
const THREE = AFRAME.THREE;

class TermObject {
  bg_material: THREE.Material;
  bg_mesh: THREE.Mesh;

  // from a-frame variables
  _aframebuffergeometry: THREE.BufferGeometry;
  glyph_mesh: THREE.Mesh;
  glyph_texture: THREE.CanvasTexture;

  constructor(renderer: AframeRenderer, color: any) {
    // create BG material and mesh
    const { width, height } = renderer.canvasSize;
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

    const glyph = renderer.GlyphRenderer;

    // create FG material and mesh
    const aframe_pos_att = new AFRAME.THREE.BufferAttribute(glyph.positions, 3);
    aframe_pos_att.usage = AFRAME.THREE.DynamicDrawUsage;
    const aframe_uv_att = new AFRAME.THREE.BufferAttribute(glyph.uvs, 2);
    aframe_uv_att.usage = AFRAME.THREE.DynamicDrawUsage;
    this._aframebuffergeometry = new AFRAME.THREE.BufferGeometry();
    this._aframebuffergeometry.setAttribute('position', aframe_pos_att);
    this._aframebuffergeometry.setAttribute('uv', aframe_uv_att);
    this._aframebuffergeometry.dynamic = true;
    this._aframebuffergeometry.attributes.position.needsUpdate = true;
    this._aframebuffergeometry.attributes.uv.needsUpdate = true;
    this._aframebuffergeometry.setIndex(new AFRAME.THREE.BufferAttribute(glyph.idx, 1));
    this._aframebuffergeometry.index!.needsUpdate = true;

    this.glyph_texture = new THREE.CanvasTexture(renderer.textureAtlas!);
    this.glyph_texture.needsUpdate = true;

    this.glyph_mesh = new THREE.Mesh(
      this._aframebuffergeometry,
      new THREE.MeshBasicMaterial({
        map: this.glyph_texture,
        color,
        transparent: true
      }));
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

    this.termObject = new TermObject(aframeaddon.Renderer!, component.data.color);

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
    this.termObject._aframebuffergeometry.index!.needsUpdate = true;
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
