// @ts-check
import CM from './src/Common.mjs'

document.addEventListener("DOMContentLoaded", (_) => {
  console.log("DOMContentLoaded");

  CM.BUILD = "RAW";

  const src = document.getElementById('scene')!;
  document.body.innerHTML = src.innerHTML;
});
