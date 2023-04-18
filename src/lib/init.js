import { global_state } from "./global_state";
import { setThingsState } from "./setThingsState";
import { createListener } from "./events/listen.js";
import { addDividerDrag } from "./events/addDividerDrag";
import { download } from "./download";
import { runCode } from "./runCode";
import { authorizePort, initSerial } from "./modularThingClient";


export function init(state) {
  if(!navigator.serial){
    // alert("🚨 Your browser doesn't seem to support the Web Serial API, which is required for Modular Things to be able to connect to hardware. You can still use the site to write code, but for full functionality, use Chrome or Edge version 89 or above.") 
  }

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

    setThingsState(things);
  });

  bodyListener("click", ".disconnect-button-trigger", async () => {
    const things = global_state.things.value;
    
    for (const name in things) {
      const thing = things[name];
      thing.close();
    }

    setThingsState({});
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
