import { global_state } from "./global_state";
import createSynchronizer from "./synchronizer";
import createMAXL from "./maxl/maxl"
import { rollup } from '@rollup/browser';

let intervals = [];
let timeouts = [];
let loops = [];

const resolvePath = (path) => (
  path.split("/")
    .reduce((a, v) => {
      if (v === ".") { } // do nothing
      else if (v === "..") {
        if (a.pop() === undefined) throw new Error(`Unable to resolve path: ${path}`)
      } else a.push(v);
      return a;
    }, [])
    .join("/")
);

const isURL = (id) => ["http://", "https://"].find(s => id.startsWith(s));

async function bundle(code) {
  const modules = {
    'main.js': code,
  };

  const result = await rollup({
    input: 'main.js',
    plugins: [
      {
        name: 'resolve',
        resolveId(source, importer) {
          if (modules.hasOwnProperty(source)) return source;

          if (["./", "../"].find(s => source.startsWith(s))) {
            if (importer) {
              const s = importer.split("/");
              s.pop();
              importer = s.join("/");
              return resolvePath(importer + "/" + source);
            }

            return resolvePath(source);
          } else if (source.startsWith("/")) {
            if (importer && isURL(importer)) {
              const url = new URL(importer);
              return resolvePath(url.origin + source);
            }

            return resolvePath(source);
          } else if (isURL(source)) {
            return source;
          }

          return { id: source, external: true };
        },
        async load(id) {
          if (modules.hasOwnProperty(id)) return modules[id];

          const response = await fetch(id);
          return response.text();
        }
      }
    ]
  })
    .then(bundle => bundle.generate({
      format: 'es',
      // inlineDynamicImports: true 
    }))
    .then(({ output }) => output[0].code);

  return result;
}

export async function runCode(code) {

  const bundledCode = await bundle(code);

  const AsyncFunction = (async function () { }).constructor;

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

  const delay = (ms) => {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms)
      // resolve();
    })
  }

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
    things[key] = global_state.things.value[key]; //.vThing;
  }

  let _log = console.log;
  let _warn = console.warn;
  let _error = console.error;

  const args = {
    ...things,
    createSynchronizer,
    createMAXL,
    setInterval: patchedInterval,
    setTimeout: patchedTimeout,
    loop,
    render,
    delay,
    // this would be rad, but doesn't work if the log is inside of a loop 
    // throws "global_state.logs.value is not iterable" error 
    // test code was 
    // ```
    // for(let i = 0; i < 100; i ++){
    //   console.warn(`switch... ${await xMotor.getLimitState()}`)
    // } 
    // ```
    // console: {
    //   log: (...args) => {
    //     _log(...args)
    //     global_state.logs.value = [...global_state.logs.value, args.join(" ")]
    //   },
    //   warn: (...args) => {
    //     _warn(...args)
    //     global_state.logs = [...global_state.logs.value, args.join(" ")]
    //   },
    //   error: (...args) => {
    //     _error(...args)
    //     global_state.logs = [...global_state.logs.value, args.join(" ")]
    //   }
    // },
    // document: null,
    // window: null,
    // eval: null,
    // global: null,
    // globalThis: null,
    viewWindow: global_state.viewWindow,
    // global: globalProxy,
    // globalThis: globalProxy,
    // window: globalProxy
  }

  const names = Object.keys(args);
  const values = Object.values(args);

  const f = new AsyncFunction(...names, bundledCode);

  f(...values);
}





