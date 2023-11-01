import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs'

export default {
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  },
  plugins: [
    basicSsl(),
  ]
}
