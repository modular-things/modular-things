import { global_state } from "./global_state";

import { createListener } from "./events/listen.js";
import { addDividerDrag } from "./events/addDividerDrag";
import { download } from "./download";
import { runCode } from "./runCode";
import { authorizePort, initSerial } from "./modularThingClient";


export function init(state) {
  initSerial();

  const bodyListener = createListener(document.body);
  addDividerDrag(state, bodyListener);

  bodyListener("click", ".run-button", () => {
    const str = global_state.codemirror.state.doc.toString();
    runCode(str);
  });

  bodyListener("click", ".download-button", () => {
    const str = global_state.codemirror.state.doc.toString();
    download("anon.js", str);
  });

  // bodyListener("click", ".scan-button-trigger", () => { });

  bodyListener("click", ".pair-button-trigger", async () => {
    const things = global_state.things.value;
    const [name, thing] = await authorizePort();
    things[name] = thing;

    // set things state
    global_state.things.value = {};
    global_state.things.value = things;
  });

  window.addEventListener("keydown", (e) => {
    const code = global_state.codemirror.state.doc.toString();

    window.localStorage.setItem("cache", code);

    if (e.keyCode === 13 && e.shiftKey) {
      runCode(code);
      e.preventDefault();
    }
  })
}