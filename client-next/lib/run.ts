import { Thing } from "./modularThingClient";
import { getStore } from "./state";
import createSynchronizer from "./virtualThings/synchronizer";
import { rollup } from "@rollup/browser";
import { FSNodeType, pathToNode } from "./fs";

let intervals: number[] = [];
let timeouts: number[] = [];
let loops: boolean[] = [];

// https://stackoverflow.com/a/62507199
// what a beautiful solution to this problem
const resolvePath = (path: string) => (
    path.split("/")
        .reduce<string[]>((a, v) => {
            if(v === ".") {} // do nothing
            else if(v === "..") {
                if(a.pop() === undefined) throw new Error(`Unable to resolve path: ${path}`)
            } else a.push(v);
            return a;
        }, [])
        .join("/")
);

// not very good, but it works
const isURL = (id: string) => ["http://", "https://"].find(s => id.startsWith(s));

async function getBundle(): Promise<string> {
    const { fs } = getStore();

    const build = await rollup({
        input: "/index.js",
        plugins: [
            {
                name: "fs-resolver",
                resolveId(source, importer) {
                    if(["./", "../"].find(s => source.startsWith(s))) {
                        if(importer) {
                            const s = importer.split("/");
                            s.pop();
                            importer = s.join("/");
                            return resolvePath(importer + "/" + source);
                        }
                        return resolvePath(source);
                    } else if(source.startsWith("/")) {
                        if(importer && isURL(importer)) {
                            const url = new URL(importer);
                            return resolvePath(url.origin + source);
                        }
                        return resolvePath(source);
                    } else if(isURL(source)){
                        return source;
                    }
                    return { id: source, external: true };
                },
                async load(id) {
                    if(isURL(id)) {
                        const res = await fetch(id);
                        return await res.text();
                    }
                    const node = pathToNode(id, fs);
                    if(node.type === FSNodeType.Folder) return null;
                    return node.content;
                }
            }
        ]
    });
    const bundle = await build.generate({
        format: "iife",
        sourcemap: "inline",
        inlineDynamicImports: true
    });
    return bundle.output[0].code;
}

export default async function runCode() {
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    const state = getStore();
    const code = await getBundle();

    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);
    loops.forEach((x, i) => {
        loops[i] = false;
    });

    const patchedInterval = (callback: (...args: any[]) => void, time: number, ...args: any[]) => {
        const interval = window.setInterval(callback, time, ...args);
        intervals.push(interval);
        return interval;
    };

    const patchedTimeout = (callback: (...args: any[]) => void, time: number, ...args: any[]) => {
        const timeout = window.setTimeout(callback, time, ...args);
        timeouts.push(timeout);
        return timeout;
    };

    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const loop = async (fn: (...args: any) => any, minterval = 0) => {
        let n = loops.length;
        loops.push(true);
        while (loops[n]) {
            const date = new Date();
            const start = date.getTime();
            await fn();
            const elapsed = date.getTime() - start;
            if (elapsed < minterval) await sleep(minterval - elapsed);
        }
    };

    const render = (node: Node) => {
        const viewWindow = state.view;
        if(!viewWindow) return;
        viewWindow.innerHTML = "";
        viewWindow.append(node);
    };

    const things: Record<string, Thing["vThing"]> = {};

    for (const key in state.things) {
      things[key] = state.things[key].vThing;
    }

    // inject items into global scope, or replace existing properties with our own
    const customGlobal = {
        setTimeout: patchedTimeout,
        setInterval: patchedInterval
    };

    const globalProxy = new Proxy(window, {
        get: (w, prop) => (
            //@ts-ignore
            prop in customGlobal ? customGlobal[prop] : w[prop].bind(w)
        )
    });
  
    const args = {
      ...things,
      ...customGlobal,
      createSynchronizer,
      loop,
      render,
      sleep,
      delay: (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms)),
    //   document: null,
    //   window: null,
    //   eval: null,
      viewEl: state.view,
      global: globalProxy,
      globalThis: globalProxy,
      window: globalProxy
    }
  
    const names = Object.keys(args);
    const values = Object.values(args);
  
    const f = new AsyncFunction(
      ...names,
      code
    );
  
    f(
      ...values
    );  
}
