import { global_state } from "./global_state"; 
import createSynchronizer from "./virtualThings/synchronizer";

let intervals = [];
let timeouts = [];
let loops = [];

export function runCode(code) {

  const AsyncFunction = (async function () {}).constructor;

  intervals.forEach(clearInterval);
  timeouts.forEach(clearTimeout);
  // intervals = [];
  // timeouts = [];
  
  loops.forEach((x, i) => { loops[i] = false });

  const patchedInterval = (callback, time, ...args) => {
    const interval = setInterval(callback, time, ...args);
    intervals.push(interval);
    return interval;
  }

  const patchedTimeout = (callback, time, ...args) => {
    const timeout = setTimeout(callback, time, ...args);
    timeouts.push(timeout);
    return timeout;
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const loop = async (fn, minterval = 0) => {
    let n = loops.length;
    loops.push(true);
    while (loops[n]) {
      const date = new Date();
      const start = date.getTime();
      await fn();
      const elapsed = (date.getTime()) - start;
      if (elapsed < minterval) await delay(minterval - elapsed);
    }
  }

  const render = (node) => {
    global_state.viewWindow.innerHTML = "";
    global_state.viewWindow.appendChild(node);
  }

  // why do this?
  const globalProxy = new Proxy(window, {
      get: (w, prop) => w[prop].bind(w)
  });

  const things = {};

  for (const key in global_state.things.value) {
    things[key] = global_state.things.value[key].vThing;
  }

  const args = {
    ...things,
    createSynchronizer,
    setInterval: patchedInterval,
    setTimeout: patchedTimeout,
    loop,
    render,
    delay,
    // document: null,
    window: null,
    eval: null,
    global: null,
    globalThis: null,
    viewWindow: global_state.viewWindow,
    // global: globalProxy,
    // globalThis: globalProxy,
    // window: globalProxy
  }

  const names = Object.keys(args);
  const values = Object.values(args);

  const f = new AsyncFunction(...names, code);

  f(...values);
}




