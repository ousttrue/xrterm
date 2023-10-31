// @ts-check

/*
 * based on aframe-xterm-component by rangermauve
 * MIT license
 */

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
   * @param {AFRAME.AComponent} obj_
   */
  constructor(obj_) {
    console.log('new tty');
    this.terminalElement = document.createElement('div');
    this.terminalElement.setAttribute('style',
      `width: 1024px; height: 1024px; opacity: 0.0; overflow: hidden;`);
    obj_.el.appendChild(this.terminalElement);

    // Build up a theme object
    const theme = Object.keys(obj_.data).reduce((theme, key) => {
      if (!key.startsWith('theme_')) { return theme; }
      const data = obj_.data[key];
      if (!data) { return theme; }
      theme[key.slice('theme_'.length)] = data;
      return theme;
    }, {});

    this.term = new Terminal({
      theme: theme,
      allowTransparency: false,
      cursorBlink: true,
      disableStdin: false,
      rows: obj_.data.rows,
      cols: obj_.data.cols,
      fontSize: 12
    });
    console.log(this.term);

    this.term.open(this.terminalElement);
    this.term.onRender((o_) => {
      // this.redraw(obj_);
    });
    this.term.onData((/** @type {string} */ data) => {
      obj_.el.emit('xrtty-data', { data });
    });
  }

  // redraw(obj_) {
  //   return;
  //   const material = obj_.el.getObject3D('mesh').material;
  //   if (!material.map) { return; }
  //   obj_.canvasContext.drawImage(obj_.cursorCanvas, 0, 0);
  //   material.map.needsUpdate = true;
  // }
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
});

