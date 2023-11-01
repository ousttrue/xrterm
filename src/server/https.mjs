// @check-ts
import express from 'express'
import expressWs from 'express-ws'
import https from 'https'
import fs from 'fs'
import util from "util"

const {
  key,
  pem,
  dir,
  host,
  port,
} = util.parseArgs({
  options: {
    key: {
      type: "string",
    },
    pem: {
      type: "string",
    },
    dir: {
      type: "string",
    },
    host: {
      type: "string",
    },
    port: {
      type: "string",
    },
  }
}).values
// console.log(parsed)

class WsConnection {
  /**
   * @param {any} ws
   * @param {any} wss
   */
  constructor(wss, ws) {
    this.wss = wss
    this.ws = ws;
    this.ws.on('message', msg => this.broadcast(msg));
  }

  /**
   * @param {string | ArrayBufferLike | Blob | ArrayBufferView} msg
   */
  broadcast(msg) {
    // console.log(this.wss.clients);
    this.wss.clients.forEach(ws => {
      if (ws == this.ws) {
        console.log(`broadcast: x`);
      }
      else {
        console.log(`broadcast: ${this.ws} => ${ws}`);
        try {
          ws.send(msg)
        } catch (e) {
          console.log('websocket.send() error.', e)
        }
      }
    });
  }
}

const _app = express();
const server = https.createServer({
  key: fs.readFileSync(key),
  cert: fs.readFileSync(pem),
}, _app)
const appWs = expressWs(_app, server);
const wss = appWs.getWss('/');

appWs.app.ws('/', (
    /** @type {WebSocket} */ ws,
    /** @type {any} */ _req
) => {
  // console.log(ws);
  const con = new WsConnection(wss, ws);
});
appWs.app.use(express.static(dir))
server.listen(parseInt(port), host, () => console.log(`https://${host}:${port}`))
