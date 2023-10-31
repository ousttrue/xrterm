import CM from './src/Common.mjs'
import XRTWorkspace from './src/client/workspace/XRTWorkspace.mjs'
import XRTTty from './src/client/term/XRTTty.mjs'
import XRTTermBare from './src/client/term/XRTTermBare.mjs'
import XRTTermBase from './src/client/term/XRTTermBase.mjs'
import XRTTermDX from './src/client/term/XRTTermDX.mjs'
import XRTTermDemo from './src/client/term/XRTTermDemo.mjs'

document.addEventListener("DOMContentLoaded", (event) => {
  console.log("DOM fully loaded and parsed");

  CM.BUILD = "RAW";

  const src = document.getElementById('scene');
  if (src) {
    document.body.innerHTML = src.innerHTML;
  }

});
