// @ts-check
import https from 'https'
import fs from 'fs';

import WebSocket, { WebSocketServer } from 'ws';
import express from 'express'
import expressWs from 'express-ws'
import pty from 'node-pty';

import CM from '../Common.mjs';

const PORT = CM.COMM_PORT
const HOST = CM.COMM_HOST
const KEY = HOST + '-key.pem'
const PEM = HOST + '.pem'
const SHELL = 'cmd.exe';

/**
 * @param {WebSocket} connection
 */
function onConnection(connection) {
  console.log(`new connection: ${connection}`)
  const env = Object.assign({ cwd: process.env.HOME }, process.env);
  const ptyProcess = pty.spawn(SHELL, [], env);

  ptyProcess.on('data', (data) => {
    connection.send(data);
  });
  ptyProcess.on('exit', () => {
    console.log('pty.exit');
    connection.close();
  });

  connection.on('message', (message, isBinary) => {
    // @ts-ignore
    ptyProcess.write(isBinary ? message.toString() : message);
  });
  connection.on('close', () => {
    console.log('ws.close');
    ptyProcess.kill();
  });
}

const _app = express();
const server = https.createServer({
  key: fs.readFileSync(KEY),
  cert: fs.readFileSync(PEM),
}, _app)
const appWs = expressWs(_app, server);
// const wss = appWs.getWss('/');

appWs.app.ws('/', (
    /** @type {WebSocket} */ ws,
    /** @type {any} */ _req
) => {
  // console.log(ws);
  onConnection(ws);
});
appWs.app.use(express.static('.'))
server.listen(PORT, HOST, () => console.log(`https://${HOST}:${PORT}`))

