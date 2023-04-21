export const SAMPLES = {
  potLoop:`
loop(async () => {
  const val = await pot.readPotentiometer(0);
  console.log(val);
}, 50);
`,
  synchronizer: `
await motor0.setCurrentScale(0.7);
await motor0.setStepsPerUnit(200);

await motor1.setCurrentScale(0.7);
await motor1.setStepsPerUnit(200);

const machine = createSynchronizer([motor0, motor1]);

machine.setPosition([0, 0]);

for (let i = 0; i < 6; i++) {
  await machine.absolute([1, 1]);
  await delay(1000);
  await machine.absolute([0, 0]);
  await delay(1000);
}

`,
  renderView: `
const el = document.createElement("div");

el.style = \`
  padding: 10px;
\`

el.innerHTML = \`
  <div>hello world!</div>
  <button>press this</button>
\`;

el
  .querySelector("button")
  .addEventListener("click", () => {
    console.log("hello");
  })

render(el);
`,
importButton:`
import confetti from 'https://cdn.skypack.dev/canvas-confetti';

confetti();

const el = document.createElement("div");

el.style = \`
  padding: 10px;
\`

el.innerHTML = \`
  <div>hello world!</div>
  <button>press this</button>
\`;

el
  .querySelector("button")
  .addEventListener("click", () => {
    confetti();
  })

render(el);
`,
capacitive:`
loop(async () => {
  const val = await cap.readPad(0);

  console.log(val);

  await cap.setRGB(val, val, val);
}, 50)
`,
potVisualization: `
const el = document.createElement("div");

const potValue = 1 // 0 to 1

const angle =  -180*(1-potValue); // -180 to 0

el.innerHTML = \`
  <div style="
    position: absolute;
    transform: translate(85px, 127px);
  ">\${potValue.toFixed(2)}</div>
  <svg>
    <path 
    stroke-width="10"
    fill="none"
    stroke="green"
    d="
      M 50 150
      A 50 50, 0, 1, 1, 150 150"
    transform-origin="100 150"
    transform="rotate(\${angle})" /> 
  </svg>
\`

render(el);
`
}

for (const k in SAMPLES) {
  SAMPLES[k] = SAMPLES[k].trim();
}