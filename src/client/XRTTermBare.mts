/// @ts-check
import XRTTty from './XRTTty.mjs';
import { AframeAddon } from '../../xterm.js-4.13.0/addons/xterm-addon-webgl/src/AframeAddon.mjs';
const DEFAULT_BG_COLOR = 0x333333;
const FOCUSED_OPACITY = 0.8;
const UNFOCUSED_OPACITY = 0.4;
const THREE = AFRAME.THREE;

class TermObject {
  bg_material: THREE.Material;
  bg_mesh: THREE.Mesh;
  glyph_mesh: THREE.Mesh;
  glyph_texture: THREE.CanvasTexture;
  constructor(aframeaddon: AframeAddon, color: any) {
    // create BG material and mesh
    const geometry = new THREE.PlaneGeometry(
      aframeaddon.canvasSize.x * 0.044,
      aframeaddon.canvasSize.y * 0.044, 8, 8);
    this.bg_material = new THREE.MeshBasicMaterial({
      color: DEFAULT_BG_COLOR,
      side: THREE.FrontSide,
      opacity: 1,
      transparent: true
    });
    this.bg_mesh = new THREE.Mesh(geometry, this.bg_material)

    // create FG material and mesh
    this.glyph_texture = new THREE.CanvasTexture(aframeaddon.textureAtlas);
    this.glyph_texture.needsUpdate = true;
    this.glyph_mesh = new THREE.Mesh(
      aframeaddon.bufferGeometry,
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
    console.log(aframeaddon.canvasSize);

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
      -aframeaddon.canvasSize.x * 0.022,
      aframeaddon.canvasSize.y * 0.022,
      0.1);
    component.el.appendChild(el_term_);

    tty.term.onRender(() => {
      this.termObject.glyph_texture.needsUpdate = true;
    });
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
});
