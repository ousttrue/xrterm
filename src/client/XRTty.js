/*
 * based on aframe-xterm-component by rangermauve
 * MIT license
 */
"use strict";
let terminalInstance = 0;

const TERMINAL_THEME = {
  theme_foreground: {
    // 'default': '#ffffff'
  },
  theme_background: {
    // 'default': '#000'
  },
  theme_cursor: {
    // 'default': '#ffffff'
  },
  theme_selection: {
    // 'default': 'rgba(255, 255, 255, 0.3)'
  },
  theme_black: {
    // 'default': '#000000'
  },
  theme_red: {
    // 'default': '#e06c75'
  },
  theme_brightRed: {
    // 'default': '#e06c75'
  },
  theme_green: {
    // 'default': '#A4EFA1'
  },
  theme_brightGreen: {
    // 'default': '#A4EFA1'
  },
  theme_brightYellow: {
    // 'default': '#EDDC96'
  },
  theme_yellow: {
    // 'default': '#EDDC96'
  },
  theme_magenta: {
    // 'default': '#e39ef7'
  },
  theme_brightMagenta: {
    // 'default': '#e39ef7'
  },
  theme_cyan: {
    // 'default': '#5fcbd8'
  },
  theme_brightBlue: {
    // 'default': '#5fcbd8'
  },
  theme_brightCyan: {
    // 'default': '#5fcbd8'
  },
  theme_blue: {
    // 'default': '#5fcbd8'
  },
  theme_white: {
    // 'default': '#d0d0d0'
  },
  theme_brightBlack: {
    // 'default': '#808080'
  },
  theme_brightWhite: {
    // 'default': '#ffffff'
  }
};

class XRTty
{
  constructor ()
  {
  }

  register ()
  {
    AFRAME.registerComponent('xterm', {
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

      write: function(message_) {
        // if (message_.length != 1)
        // {
        //   this.term.write(message_[0]);
        // }
        // else
        {
          this.term.write(message_);
        }
        // message_.size();
        // console.log("write: " + message_);
      },
      tick: function (time_, timeDelta_) {
      },
      init: function () {
        const terminalElement = document.createElement('div');
        terminalElement.setAttribute('style', `
      width: 512px;
      height: 256px;
      opacity: 0.0;
      overflow: hidden;
    `);

        this.el.appendChild(terminalElement);
        this.el.terminalElement = terminalElement;

        // Build up a theme object
        const theme = Object.keys(this.data).reduce((theme, key) => {
          if (!key.startsWith('theme_')) { return theme; }
          const data = this.data[key];
          if(!data) { return theme; }
          theme[key.slice('theme_'.length)] = data;
          return theme;
        }, {});

        const term = new Terminal({
          theme: theme,
          allowTransparency: true,
          cursorBlink: true,
          disableStdin: false,
          rows: this.data.rows,
          cols: this.data.cols,
          fontSize: 64
        });

        this.term = term;
        term.open(terminalElement);

        this.canvas = terminalElement.querySelector('.xterm-text-layer');
        this.canvas.id = 'terminal-' + (terminalInstance++);
        this.canvasContext = this.canvas.getContext('2d');

        this.cursorCanvas = terminalElement.querySelector('.xterm-cursor-layer');

        this.el.setAttribute('material', 'transparent', true);
        this.el.setAttribute('material', 'src', '#' + this.canvas.id);

        term.on('refresh', () => {
          const material = this.el.getObject3D('mesh').material;
          if (!material.map) { return; }

          this.canvasContext.drawImage(this.cursorCanvas, 0,0);

          material.map.needsUpdate = true;
        });

        term.on('data', (data) => {
          this.el.emit('xterm-data', data);
        });

        this.el.addEventListener('click', () => {
          term.focus();
        });
      }
    });
  }
}

class hoge
{
  constructor ()
  {
  }
}
