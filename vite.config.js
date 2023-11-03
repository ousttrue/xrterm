import fs from 'fs'
import path from "path";
import basicSsl from '@vitejs/plugin-basic-ssl'
import { importMaps } from 'vite-plugin-import-maps';

export default {
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  },
  plugins: [
    basicSsl(),
    importMaps([
      {
        imports: {
          "aframe": "https://aframe.io/releases/1.4.0/aframe.min.js",
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      "browser": path.resolve(__dirname, "xterm.js-4.13.0/src/browser"),
      "common": path.resolve(__dirname, "xterm.js-4.13.0/src/common"),
    },
  },
}
