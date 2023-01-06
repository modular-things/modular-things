import { Thing } from "./modularThingClient";
import { GlobalState } from "./state";
import createSynchronizer from "./virtualThings/synchronizer";

let intervals: number[] = [];
let timeouts: number[] = [];
let loops: boolean[] = [];

export default function runCode(code: string, state: GlobalState) {
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

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
  
    const args = {
      ...things,
      setInterval: patchedInterval,
      setTimeout: patchedTimeout,
      createSynchronizer,
      loop,
      render,
      sleep,
      delay: (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms)),
      // document: null,
      window: null,
      eval: null,
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
