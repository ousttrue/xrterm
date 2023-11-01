// @ts-check

/*
 * based on aframe-xterm-component by rangermauve
 * MIT license
 */

import CM from '../../Common.mjs';
import TERMINAL_THEME from '../XRTTheme.mjs';

export default class XRTTty {
  /**
   * @type HTMLElement
   */
  terminalElement;

  /**
   * @type Terminal
   */
  term;

  /**
   * @type AframeAddon
   */
  aframeaddon;

  /**
   * @param {AFRAME.AComponent} obj_
   */
  constructor(component) {
    console.log('new tty');
    this.terminalElement = document.createElement('div');
    this.terminalElement.setAttribute('style',
      `width: 1024px; height: 1024px; opacity: 0.0; overflow: hidden;`);
    component.el.appendChild(this.terminalElement);

    // Build up a theme object
    const theme = Object.keys(component.data).reduce((theme, key) => {
      if (!key.startsWith('theme_')) { return theme; }
      const data = component.data[key];
      if (!data) { return theme; }
      theme[key.slice('theme_'.length)] = data;
      return theme;
    }, {});

    this.term = new Terminal({
      theme: theme,
      allowTransparency: false,
      cursorBlink: true,
      disableStdin: false,
      rows: component.data.rows,
      cols: component.data.cols,
      fontSize: 12
    });
    console.log(this.term);

    this.term.open(this.terminalElement);

    // @ts-ignore
    const gl = document.querySelector('a-scene').renderer.getContext();
    this.aframeaddon = new AframeAddon(gl);
    this.term.loadAddon(this.aframeaddon);

    const message = 'Initialized\r\n';
    this.term.write(message);

    const socket = new WebSocket(`wss://${CM.COMM_HOST}:${CM.COMM_PORT}/`);
    // Listen on data, write it to the terminal
    socket.onmessage = ({ data }) => {
      console.log(data);
      this.term.write(data);
    };
    socket.onclose = () => {
      this.term.write('\r\nConnection closed.\r\n');
    };
    this.term.onData((/** @type {string} */ data) => {
      socket.send(data);
    });
  }

  tick() {
    this.term.focus();
    this.aframeaddon.tick();
  }
}

console.log('AFRAME.registerComponent', 'xrtty')
AFRAME.registerComponent('xrtty', {
  schema: Object.assign({
    cols: {
      type: 'number',
      default: 80
    },
    rows: {
      type: 'number',
      default: 25
    },
  }, TERMINAL_THEME),
  /**
  * @this {AFRAME.AComponent & {impl: XRTTty}}
  */
  init: function() {
    this.impl = new XRTTty(this);

    // event listener
    this.el.addEventListener('click', () => {
      this.impl.term.focus();
      console.log('focused on ', this);
    });
    this.el.addEventListener('raycaster-intersected', () => {
      this.impl.term.focus();
      console.log('intersected');
    });
    this.el.addEventListener('raycaster-cleared', () => {
      console.log('cleared');
    });
  },
  /**
  * @this {AFRAME.AComponent & {impl: XRTTty}}
  */
  tick: function() {
    this.impl.tick();
  }
});
