// @ts-check
import CM from '../../Common.mjs'
import XRTInput from '../XRTInput.mjs';
import XRTPlacement from './XRTPlacement.mjs';
import XRTRig from './XRTRig.mjs';
import XRTCommand from '../XRTCommand.mjs';

export default class XRTWorkspace {
  /**
  * @type XRTInput
  */
  input_;

  /**
  * @type XRTPlacement
  */
  placement_;

  /**
  * @type AFRAME.AEntity?
  */
  camera_el_;

  /**
  * @type XRTCommand[]
  */
  cmd_queue_;

  /**
   * @param {AFRAME.AEntity} el
   */
  constructor(el) {
    this.input_ = new XRTInput();
    this.input_.init(el);

    switch (CM.BUILD) {
      case 'RAW': console.log("this is raw"); break;
      case 'ELECTRON': console.log("this is electron"); break;
      case 'DEMO': console.log("this is demo"); break;
      default:
    }

    this.placement_ = new XRTPlacement();

    this.camera_el_ = null;
    this.cmd_queue_ = [];

    this.raycaster = null;
    this.grabbed_el_ = null;

    this.rig = new XRTRig();

    this.camera_el_ = document.querySelector('[camera]');
    this.el_ = document.querySelector('[workspace]');

    this.placement_.init();
    this.el_.appendChild(this.placement_.get_base());

    this.rig.init(this.camera_el_);

    let insec_el = this.rig.get_intersection();
    this.el_.appendChild(insec_el);
  }

  tick(time_, delta_) {
    this.input_.tick();
    // update rig
    this.rig.tick(this, this.input_, CM.Config, this.camera_el_.object3D);

    for (const pressed_key in this.input_.get_pressed()) { 
      this.key_to_cmd_(pressed_key); 
    }
    this.grabbed_el_ = this.rig.get_grabbed();

    // update other command
    this.pointer_to_cmd_();
    this.invoke_cmd_();
  }

  tock(time_, delta_) {
    this.input_.tock();
  }

  /**
   * @param {string} pressed_key_
   */
  key_to_cmd_(pressed_key_) {
    if (this.input_.get_keystate(CM.Config.get_modkey())) {
      return;
    }
    let cmd_type = CM.Config.key_to_cmdtype(pressed_key_);
    if (cmd_type) {
      let cmd = new XRTCommand(cmd_type, "0 0 0");
      this.cmd_queue_.push(cmd);
    }
  }

  pointer_to_cmd_() {
    this.placement_.watch(this.grabbed_el_,
      this.rig.get_intersection());
  }

  invoke_cmd_() {
    for (const cmd of this.cmd_queue_) {
      console.log('cmd found: ' + cmd.get_type());

      switch (cmd.get_type()) {
        case CM.WS_CMD.OPEN_BROWSER:
          console.log('open browser');
          break;
        case CM.WS_CMD.OPEN_TERMINAL:
          console.log('openterminal' + cmd.get_argument());
          this.open_terminal_(cmd.get_argument());
          break;
        default:
          break;
      }
    }
    this.cmd_queue_ = [];
  }

  /**
   * @param {string} pos_
   */
  open_terminal_(pos_) {
    var new_el_ = document.createElement('a-curvedimage');
    document.querySelector('a-scene').appendChild(new_el_);
    new_el_.classList.add('collidable');
    new_el_.setAttribute('term-dx', {
      'theta-length': '60',
      radius: '6',
      height: '4',
      rotation: '0 150 0',
      position: pos_,
    });
  }
}

console.log('AFRAME.registerComponent', 'workspace');
AFRAME.registerComponent('workspace', {
  schema: {
    acceleration: { default: 65 },
    adAxis: { default: 'x', oneOf: ['x', 'y', 'z'] },
    adEnabled: { default: true },
    adInverted: { default: false },
    enabled: { default: true },
    fly: { default: false },
    wsAxis: { default: 'z', oneOf: ['x', 'y', 'z'] },
    wsEnabled: { default: true },
    wsInverted: { default: false }
  },

  /**
  * @this {AFRAME.AComponent & {impl: XRTWorkspace}}
  */
  init: function() {
    this.impl = new XRTWorkspace(this.el);

    this.el.addEventListener('raycaster-intersected', e_ => {
      this.impl.raycaster = e_.detail.el;
      console.log('raycaster intersected');
    });
    this.el.addEventListener('raycaster-intersected-cleared', e_ => {
      this.impl.raycaster = null;
      console.log('raycaster intersected cleared');
    });
  },

  /**
  * @this {AFRAME.AComponent & {impl: XRTWorkspace}}
  */
  tick: function(time_, delta_) {
    this.impl.tick(time_, delta_);
  },

  /**
  * @this {AFRAME.AComponent & {impl: XRTWorkspace}}
  */
  tock: function(time_, delta_) {
    this.impl.tock(time_, delta_);
  },

  /**
  * @this {AFRAME.AComponent & {impl: XRTWorkspace}}
  */
  remove: function() {
    this.impl.input_.finish();
  },
});
