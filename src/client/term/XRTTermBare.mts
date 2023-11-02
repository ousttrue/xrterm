/// @ts-check
import XRTTty from './XRTTty.mjs';
const DEFAULT_BG_COLOR = 0x333333;
const FOCUSED_OPACITY = 0.8;
const UNFOCUSED_OPACITY = 0.4;
const THREE = AFRAME.THREE;

export default class XRTTermBare {
  bg_geometry_: THREE.PlaneGeometry;
  bg_material_: THREE.MeshBasicMaterial;
  canvas_texture: THREE.CanvasTexture;
  el_term_: typeof AFRAME.AEntity;

  constructor(component: typeof AFRAME.AComponent) {
    // @ts-ignore
    const tty = (component.el.components['xrtty'].impl) as XRTTty;
    const aframeaddon = tty.aframeaddon;
    console.log(aframeaddon.canvasSize);

    // create BG material and mesh
    this.bg_geometry_ = new THREE.PlaneGeometry(
      aframeaddon.canvasSize.x * 0.044,
      aframeaddon.canvasSize.y * 0.044, 8, 8);
    this.bg_material_ = new THREE.MeshBasicMaterial({
      color: DEFAULT_BG_COLOR, side: THREE.FrontSide,
      opacity: 1, transparent: true
    });
    const mesh = new THREE.Mesh(this.bg_geometry_, this.bg_material_)

    component.el.setObject3D('mesh', mesh);
    // @ts-ignore
    component.el.addEventListener('raycaster-intersected', (_) => {
      this.focused();
    });
    // @ts-ignore
    component.el.addEventListener('raycaster-intersected-cleared', (_) => {
      this.unfocused();
    });

    this.canvas_texture = new THREE.CanvasTexture(
      aframeaddon.textureAtlas);
    this.canvas_texture.needsUpdate = true;

    let glyph_geometry = aframeaddon.bufferGeometry;
    var term_mesh = new THREE.Mesh(
      glyph_geometry,
      new THREE.MeshBasicMaterial({
        map: this.canvas_texture,
        color: component.data.color, transparent: true
      }));
    this.el_term_ = document.createElement('a-entity');
    this.el_term_.setObject3D('mesh', term_mesh);

    console.log(aframeaddon.canvasSize);
    this.el_term_.object3D.position.set(
      -aframeaddon.canvasSize.x * 0.022,
      aframeaddon.canvasSize.y * 0.022,
      0.1);

    component.el.appendChild(this.el_term_);

    tty.term.onRender(() => {
      this.canvas_texture.needsUpdate = true;
    });
  }

  focused() {
    this.bg_material_.opacity = FOCUSED_OPACITY;
  }

  unfocused() {
    this.bg_material_.opacity = UNFOCUSED_OPACITY;
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
