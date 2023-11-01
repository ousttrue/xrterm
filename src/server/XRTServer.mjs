// @ts-check

import XRTShell from './XRTShell.mjs';

export default class XRTServer {
  constructor() {
    this.shell_ = new XRTShell();
  }

  init() {
    this.shell_.init();
  }

  start() {
    this.shell_.start();
  }
}
