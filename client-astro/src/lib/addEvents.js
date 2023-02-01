import { global_state } from "./global_state";

import { createListener } from "./events/listen.js";
import { addDividerDrag } from "./events/addDividerDrag";
import { download } from "./download";
import { runCode } from "./runCode";

export function addEvents(state) {
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

  window.addEventListener("keydown", (e) => {
    const code = global_state.codemirror.state.doc.toString();

    window.localStorage.setItem("cache", code);

    if (e.keyCode === 13 && e.shiftKey) {
      runCode(code);
      e.preventDefault();
    }
  })
}