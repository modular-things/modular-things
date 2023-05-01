import { global_state } from "./global_state";
import { setThingsState } from "./setThingsState";
import { createListener } from "./events/listen.js";
import { addDividerDrag } from "./events/addDividerDrag";
import { download } from "./download";
import { runCode } from "./runCode";
import { authorizePort, initSerial, disconnectAll } from "./modularThingClient";

export function init(state) {
  if (!navigator.serial) {
    alert(
      "🚨 Your browser doesn't seem to support the Web Serial API, which is required for Modular Things to be able to connect to hardware. You can still use the site to write code, but for full functionality, use Chrome or Edge version 89 or above."
    );
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
    // const things = global_state.things.value;
    // was like... 
    // const [name, thing] = await authorizePort();
    // things[name] = thing;

    // setThingsState(things);
    // shold just do 
    await authorizePort();
    // and let handlers... handle new ports 
  });

  bodyListener("click", ".disconnect-button-trigger", async () => {
    await disconnectAll();
    // const things = global_state.things.value;
    // for (const name in things) {
    //   const thing = things[name];
    //   thing.close();
    // }
    // setThingsState({});
  });

  window.addEventListener("keydown", (e) => {
    const code = global_state.codemirror.state.doc.toString();

    window.localStorage.setItem("cache", code);

    if (e.keyCode === 13 && e.shiftKey) {
      runCode(code);
      e.preventDefault();
    }
  })

  const cache = window.localStorage.getItem("cache");
  const cm = global_state.codemirror;
  cm.dispatch({
    changes: { from: 0, insert: cache ?? "" }
  });

  const search = window.location.search;
  const file = new URLSearchParams(search).get("file");

  const isProduction = window.location.hostname === "modular-things.github.io";
  if (file) {
    let file_url = file;
    if (!file.startsWith("http"))
      file_url = isProduction
        ? `https://raw.githubusercontent.com/modular-things/modular-things/main/examples/${file}`
        : `examples/${file}`;

    fetch(file_url).then(async (res) => {
      const text = await res.text();

      const currentProg = cm.state.doc.toString();

      cm.dispatch({
        changes: { from: 0, to: currentProg.length, insert: text }
      });

      global_state.panelType.value = "view";
      document.documentElement.style.setProperty("--cm-width", `1%`);
      document.querySelector(".run-button").click();

      // TODO: weird bug with this
      setTimeout(() => {
        document.querySelector(".run-button").click();
      }, 500);
    });
  }
}
