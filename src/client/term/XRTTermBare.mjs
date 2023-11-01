// @ts-check
import CM from '../../Common.mjs';
import XRTTty from './XRTTty.mjs';
/// <reference path="../../../node_modules/@types/three/index.d.ts" />

const DEFAULT_BG_COLOR = 0x333333;
const FOCUSED_OPACITY = 0.8;
const UNFOCUSED_OPACITY = 0.4;

const TERM_ANIMATION_FADEIN = "property: material.opacity; from: 0; to: 1; dur: 100; easing: linear; loop: false";
const TERM_ANIMATION_FADEOUT = "property: material.opacity; from: 1; to: 0; dur: 100; easing: linear; loop: false";
const TERM_FIX = "property: material.color; from: #F0F; to: #00F;";

export default class XRTTermBare {
  /**
   * @type {XRTTty}
   */
  tty;

  /**
   * @param {AFRAME.AComponent} component
   */
  constructor(component) {
    // @ts-ignore
    this.tty = /** @type {XRTTty} */ (component.el.components['xrtty'].impl);
    console.log(this.tty);

    // @ts-ignore
    this.gl_ = document.querySelector('a-scene').renderer.getContext();
    this.aframeaddon = new AframeAddon(this.gl_);
    this.tty.term.loadAddon(this.aframeaddon);

    this.show(component.el, component.data.color);

    const message = 'Initialized\r\n';
    this.tty.term.write(message);

    const socket = new WebSocket(`wss://${CM.COMM_HOST}:${CM.COMM_PORT}/`);
    // Listen on data, write it to the terminal
    socket.onmessage = ({ data }) => { this.tty.term.write(data); };
    socket.onclose = () => { this.tty.term.write('\r\nConnection closed.\r\n'); };
    // @ts-ignore
    component.el.addEventListener('xrtty-data', ({ detail }) => {
      socket.send(detail.data);
    });
  }

  focused() {
    this.bg_material_.opacity = FOCUSED_OPACITY;
  }

  unfocused() {
    this.bg_material_.opacity = UNFOCUSED_OPACITY;
  }

  /**
   * @param {AFRAME.AEntity} el
   * @param {string} fg_color_
   */
  show(el, fg_color_) {
    // create BG material and mesh
    this.bg_geometry_ = new THREE.PlaneGeometry(this.aframeaddon.canvasSize.x * 0.044,
      this.aframeaddon.canvasSize.y * 0.044, 8, 8);
    this.bg_material_ = new THREE.MeshBasicMaterial({
      color: DEFAULT_BG_COLOR, side: THREE.FrontSide,
      opacity: 0.5, transparent: true
    });
    el.setObject3D('mesh', new THREE.Mesh(this.bg_geometry_,
      this.bg_material_));
    el.addEventListener('raycaster-intersected', (obj_) => { this.focused(); });
    el.addEventListener('raycaster-intersected-cleared', (obj_) => { this.unfocused(); });

    this.canvas_texture = new THREE.CanvasTexture(this.aframeaddon.textureAtlas);
    this.canvas_texture.needsUpdate = true;
    this.fg_color_ = fg_color_;

    let glyph_geometry = this.aframeaddon.bufferGeometry;
    var term_mesh = new THREE.Mesh(glyph_geometry,
      new THREE.MeshBasicMaterial({
        map: this.canvas_texture,
        color: this.fg_color_, transparent: true
      }));
    // term_mesh.geometry.boundingSphere = new THREE.Sphere( new THREE.Vector3(0, 0, 0), 40 );
    this.el_term_ = document.createElement('a-entity');
    this.el_term_.setObject3D('mesh', term_mesh);

    console.log(this.aframeaddon.canvasSize);
    this.el_term_.object3D.position.set(-this.aframeaddon.canvasSize.x * 0.022,
      this.aframeaddon.canvasSize.y * 0.022, 0.1);

    el.appendChild(this.el_term_);
  }

  get_dragging_type() {
    return CM.WS_PLACEMENT.PLANE;
  }

  tick() {
    this.aframeaddon.tick();
    this.canvas_texture.needsUpdate = true;
  }
}


console.log('AFRAME.registerComponent', 'term-bare');
AFRAME.registerComponent('term-bare', {
  dependencies: ['xrtty'],
  schema: { color: { default: '#ffffff' } },

  /**
  * @this {AFRAME.AComponent & {impl: XRTTermBare}
  */
  init: function() {
    this.impl = new XRTTermBare(this);
  },

  /**
  * @this {AFRAME.AComponent & {impl: XRTTermBare}
  */
  tick: function(time_, delta_) {
    this.impl.tick();
  },
});
