import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs'
import * as path from "path";

export default {
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  },
  plugins: [
    basicSsl(),
  ],
  resolve: {
    alias: {
      "browser": path.resolve(__dirname, "xterm.js-4.14.1/src/browser"),
      "common": path.resolve(__dirname, "xterm.js-4.14.1/src/common"),
    },
  },
}
