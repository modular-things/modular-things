import "./modularThingClient.js";
import { global_state } from "./global_state.js";

import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@2.4.0/lit-html.min.js";

const view = (state) => html`
  <div class="menu">
    <div class="menu-item" @click=${runCode}>run (shift+enter)</div>
  </div>
  <div class="content">
    <div class="left-pane">
      <textarea spellcheck="false" class="code-editor"></textarea>
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
      <div class="thing-name">${thing[0]}</div>
      <button class="button" @click=${() => global_state.renaming = thing[0] }>rename</button>
    </div>
    <div class="thing-api">${getApi(thing[1].vThing)}</div>
  </div>
`

const getApi = (thing) => {
  const api = Object.keys(thing).map( x => [ x, getParamNames(thing[x]) ]);
  return api.filter(x => x[0] !== "setup").map(apiEntry);
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
    <button class="button">rename</button>
    <button class="button" @click=${() => state.renaming = ""}>close</button>
  </div>
`

const r = () => {
  render(view(global_state), document.body);
  window.requestAnimationFrame(r);
};

r();

function runCode(e) {
  const code = document.querySelector(".code-editor").value;

  const thingNames = Object.keys(global_state.things);
  const thingValues = Object.values(global_state.things).map(thing => thing.vThing);

  const f = new Function(...thingNames, code);
  f(...thingValues);
}

window.addEventListener("keydown", (e) => {
  if (e.keyCode === 13 && e.shiftKey) {
    runCode();
    e.preventDefault();
  }
})
