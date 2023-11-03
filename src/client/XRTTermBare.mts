/// @ts-check
import TermObject from './TermObject.mjs'
import CM from '../Common.mjs'

export default class XRTTermBare {
  termObject: TermObject

  constructor(component: typeof AFRAME.AComponent) {
    // @ts-ignore
    const tty = (component.el.components['xrtty'].impl) as XRTTty;
    const aframeaddon = tty.aframeaddon;
    this.termObject = new TermObject(aframeaddon.Renderer, component.data);
    component.el.setObject3D('mesh', this.termObject.bg_mesh);
    component.el.appendChild(this.termObject.glyph_el);
    tty.term.onRender(() => {
      // TODO: when atlas updated
      this.termObject.glyph_texture.needsUpdate = true;
    });

    // ws to node-pty
    const protocol = (location.protocol == "https:") ? "wss" : "ws";
    const url = `${protocol}://${location.hostname}`;
    const socket = new WebSocket(`${url}:${CM.COMM_PORT}/`);
    // Listen on data, write it to the terminal
    socket.onmessage = ({ data }) => {
      // console.log(data);
      tty.term.write(data);
    };
    socket.onclose = () => {
      tty.term.write('\r\nConnection closed.\r\n');
    };
    tty.term.onData((data: string) => {
      // console.log(`onData: ${data}`)
      socket.send(data);
    });
  }

  tick() {
    this.termObject._aframebuffergeometry.attributes.position.needsUpdate = true;
    this.termObject._aframebuffergeometry.attributes.uv.needsUpdate = true;
  }
}

console.log('AFRAME.registerComponent', 'term-bare');
AFRAME.registerComponent('term-bare', {
  dependencies: ['xrtty'],
  schema: {
    width: { default: 1 },
    height: { default: 0.6 },
    depth: { default: 0.05 },
    color: { default: '#ffffff' },
    background: { default: '#000000' }
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
