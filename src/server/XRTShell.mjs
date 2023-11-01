// @ts-check

import http from 'http';
import { WebSocketServer } from 'ws';
import os from 'os';
import pty from 'node-pty';
import CM from '../Common.mjs';

export default class XRTShell {
  constructor() {
    this.svr_port_ = CM.COMM_PORT;
    this.shell_ = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
    this.cmd_server_ = new http.Server();
    /*
      const server = new https.createServer({
      key: fs.readFileSync('./src/server/private.key'),
      cert: fs.readFileSync('./src/server/private.pem')
      });
      */
    this.socket_ = new WebSocketServer({ server: this.cmd_server_ });
  }

  init() {
    this.socket_.on('connection', (connection) => {
      const ptyProcess = pty.spawn(this.shell_, [], {
        cwd: process.env.HOME,
        env: process.env
      });

      ptyProcess.on('data', (data) => {
        connection.send(data);
      });

      connection.on('message', (message) => {
        ptyProcess.write(message);
      });

      ptyProcess.once('close', () => {
        connection.removeAllListeners();
        connection.close();
      });

      connection.once('close', () => {
        ptyProcess.removeAllListeners();
        ptyProcess.destroy();
      });
    });
  }

  start() {
    this.cmd_server_.listen(this.svr_port_);
    console.log("Server running on port " + String(this.svr_port_));
  }
}
