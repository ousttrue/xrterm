// @ts-check

import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import pty from 'node-pty';
import CM from '../Common.mjs';

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

const server = new http.Server();
const wsServer = new WebSocketServer({ server });
wsServer.on('connection', onConnection);
server.listen(CM.COMM_PORT);
console.log(`ws://localhost:${CM.COMM_PORT}`)

