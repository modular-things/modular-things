import { rescan } from "./modularThingClient.js";
import { global_state } from "./global_state.js";

import { render, html } from "lit-html";

import "./codemirror.js";

const view = (state) => html`
  <div class="menu">
    <div class="menu-item" @click=${runCode}>run (shift+enter)</div>
    <div class="menu-item" @click=${rescan}>scan</div>
  </div>
  <div class="content">
    <div class="left-pane">
      <codemirror-editor></codemirror-editor>
      <!-- <textarea spellcheck="false" class="code-editor"></textarea> -->
    </div>
    <div class="things">
      <div style="font-weight:700; font-size: 1.2em; padding-bottom: 10px;">List of Things</div>
      ${Object.entries(global_state.things).map(drawThing)}
    </div>
  </div>
  ${state.renaming !== "" ? renameForm(state) : ""}
`

const drawThing = (thing) => html`
  <div class="thing">
    <div class="thing-top-line">
      <div class="thing-name">Name: ${thing[0]}</div>
      <button class="button" @click=${() => global_state.renaming = thing[0] }>rename</button>
    </div>
    <div>Type: ${thing[1].firmwareName}</div>
    <div class="thing-api">${getApi(thing[1].vThing)}</div>
  </div>
`

const getApi = (thing) => {
  const api = Object.keys(thing).map( x => [ x, getParamNames(thing[x]) ]);
  // don't include "setup" or "setName" or "vt"
  return api
    .filter(x => !["setup", "setName", "vt", "firmwareName"].includes(x[0]))
    .map(apiEntry);
}

const apiEntry = ([name, params]) => html`
  <div class="apiEntry">${name}(${params.join(", ")})</div>
`

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null)
     result = [];
  return result;
}

const renameForm = (state) => html`
  <div class="rename-form">
    <div class="rename-input">
      <div class="rename-label">Name:</div>
      <input .value=${state.renaming} class="rename-form-input"/>
    </div>
    <button class="button" @click=${() => {
      // console.log(state);
      const thing = state.things[state.renaming];
      const newName = document.querySelector(".rename-form-input").value;
      thing.vThing.setName(newName);
      delete state.things[state.renaming];
      state.things[newName] = thing;
      state.renaming = "";
    }}>rename</button>
    <button class="button" @click=${() => state.renaming = ""}>close</button>
  </div>
`

const r = () => {
  render(view(global_state), document.body);
  window.requestAnimationFrame(r);
};

function init() {
  r();
  const cache = localStorage.getItem('cache');
  if (cache) {
    const cm = document.querySelector("codemirror-editor");
    cm.view.dispatch({
      changes: { from: 0, insert: cache ?? "" }
    });
  }
}

init();

function getCode() {
  const cm = document.querySelector("codemirror-editor");
  const doc = cm.view.state.doc;
  const code = doc.toString();

  return code;
}

let intervals = [];
let timeouts = [];

function runCode(e) {
  const code = getCode();

  const AsyncFunction = (async function () {}).constructor;

  intervals.forEach(clearInterval);
  timeouts.forEach(clearTimeout);

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

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const loop = async (fn, minterval = 10) => {
    const date = new Date();
    const start = date.getTime();
    await fn();
    const elapsed = (date.getTime()) - start;
    if (elapsed < minterval) await sleep(minterval - elapsed);
    // if (minterval === 0) setTimeout(() => {}, 0);
    loop(fn, minterval);
  }

  const things = {};

  for (const key in global_state.things) {
    things[key] = global_state.things[key].vThing;
  }

  const args = {
    ...things,
    setInterval: patchedInterval,
    setTimeout: patchedTimeout,
    loop,
    document: null,
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

window.addEventListener("keydown", (e) => {
  const code = getCode();

  window.localStorage.setItem("cache", code);

  if (e.keyCode === 13 && e.shiftKey) {
    runCode();
    e.preventDefault();
  }
})
