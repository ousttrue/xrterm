// @ts-check
import https from 'https'
import fs from 'fs';
import os from 'os';

import WebSocket, { WebSocketServer } from 'ws';
import express from 'express'
import expressWs from 'express-ws'
import pty from 'node-pty';

import CM from '../Common.mjs';

const PORT = CM.COMM_PORT
const KEY = 'localhost-key.pem'
const PEM = 'localhost.pem'

const SHELL = os.platform() === "win32" ? 'cmd.exe' : '/usr/bin/bash';

/**
 * @param {WebSocket} connection
 */
function onConnection(connection) {
  const env = Object.assign({ cwd: process.env.HOME }, process.env);
  console.log(`launch: ${SHELL}`)
  const ptyProcess = pty.spawn(SHELL, [], env);

  ptyProcess.onData((data) => {
    connection.send(data);
  });
  ptyProcess.onExit(() => {
    console.log('pty.exit');
    connection.close();
  });

  connection.onmessage((message, isBinary) => {
    // @ts-ignore
    ptyProcess.write(isBinary ? message.toString() : message);
  });
  connection.onclose(() => {
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
server.listen(PORT, '0.0.0.0', () => console.log(`https://0.0.0.0:${PORT}`))

