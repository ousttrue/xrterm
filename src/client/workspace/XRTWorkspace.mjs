// @ts-check
import CM from '../../Common.mjs'

export default class XRTWorkspace {
  /**
   * @param {AFRAME.AEntity} el
   */
  constructor(el) {
    switch (CM.BUILD) {
      case 'RAW': console.log("this is raw"); break;
      case 'ELECTRON': console.log("this is electron"); break;
      case 'DEMO': console.log("this is demo"); break;
      default:
    }
  }
}

console.log('AFRAME.registerComponent', 'workspace');
AFRAME.registerComponent('workspace', {
  schema: {
    acceleration: { default: 65 },
    adAxis: { default: 'x', oneOf: ['x', 'y', 'z'] },
    adEnabled: { default: true },
    adInverted: { default: false },
    enabled: { default: true },
    fly: { default: false },
    wsAxis: { default: 'z', oneOf: ['x', 'y', 'z'] },
    wsEnabled: { default: true },
    wsInverted: { default: false }
  },

  /**
  * @this {AFRAME.AComponent & {impl: XRTWorkspace}}
  */
  init: function() {
    this.impl = new XRTWorkspace(this.el);

    this.el.addEventListener('raycaster-intersected', e_ => {
      console.log('raycaster intersected');
    });
    this.el.addEventListener('raycaster-intersected-cleared', e_ => {
      console.log('raycaster intersected cleared');
    });
  },
});
