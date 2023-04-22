import styles from '../styles/TopMenu.module.css'

import { global_state } from "../lib/global_state"
import { SAMPLES } from "../lib/SAMPLES"

function setCode(code) {
  const cm = global_state.codemirror;
  const current = cm.state.doc.toString();
  cm.dispatch({
    changes: { from: 0, to: current.length, insert: code }
  });
}

const githubLogoStyle = {
  position: "absolute",
  right: "10px",
  color: "white",
}

export default function TopMenu() {
  return (
    <div class={[styles["top-menu"], "prevent-select"].join(" ")}>
      <div class={styles["menu-title"]}>Modular Things</div>
      <div class={[styles["menu-item"], "run-button"].join(" ")}>run (shift+enter)</div>
      <div class={[styles["menu-item"], "dropdown"].join(" ")}>
        examples
        <div class="inner-dropdown">
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["potLoop"])}>read pot loop</div>
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["synchronizer"])}>createSynchronizer</div>
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["renderView"])}>render view</div>
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["importButton"])}>url import</div>
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["capacitive"])}>capacitive</div>
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["potVisualization"])}>potVisualization</div>
        </div>
      </div>
      <div class={[styles["menu-item"], "download-button"].join(" ")}>download</div>
      <a style={githubLogoStyle} href="https://github.com/modular-things/modular-things">
        <i class="fa fa-github" style="font-size:24px"></i>
      </a>
    </div>
  )
}