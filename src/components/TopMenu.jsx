import styles from '../styles/TopMenu.module.css'

import { global_state } from "../lib/global_state"

function setCode(code) {
  const cm = global_state.codemirror;
  const current = cm.state.doc.toString();
  cm.dispatch({
    changes: { from: 0, to: current.length, insert: code }
  });
}

const SAMPLES = {
  potLoop:`loop(async () => {
  const val = await pot.readPotentiometer(0);
  console.log(val);
}, 50);
`,
  sychronizer: `await motor0.setCurrentScale(0.7);
await motor0.setStepsPerUnit(200);

await motor1.setCurrentScale(0.7);
await motor1.setStepsPerUnit(200);

const machine = createSychronizer([motor0, motor1]);

machine.setPosition([0, 0]);

for (let i = 0; i < 6; i++) {
  await machine.absolute([1, 1]);
  await delay(1000);
  await machine.absolute([0, 0]);
  await delay(1000);
}

`,
  renderView: `const el = document.createElement("div");

el.style = \`
  padding: 10px;
\`

el.innerHTML = \`
  <div>hello world!</div>
  <button>press this</button>
\`;

render(el);
`
}


export default function TopMenu() {
  return (
    <div class={[styles["top-menu"], "prevent-select", "top-menu"].join(" ")}>
      <div class={styles["menu-title"]}>Modular Things</div>
      <div class={[styles["menu-item"], "run-button"].join(" ")}>run (shift+enter)</div>
      <div class={[styles["menu-item"], "dropdown"].join(" ")}>
        examples
        <div class="inner-dropdown">
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["potLoop"])}>read pot loop</div>
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["sychronizer"])}>createSychronizer</div>
          <div class={[styles["menu-item"], "dropdown-item"].join(" ")} onClick={() => setCode(SAMPLES["renderView"])}>render view</div>
        </div>
      </div>
      <div class={[styles["menu-item"], "download-button"].join(" ")}>download</div>
      <a class="github-logo" href="https://github.com/modular-things/modular-things">
        <i class="fa fa-github" style="font-size:24px"></i>
      </a>
    </div>
  )
}