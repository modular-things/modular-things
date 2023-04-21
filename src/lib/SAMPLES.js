export const SAMPLES = {
  potLoop:`
loop(async () => {
  const val = await pot.readPotentiometer(0);
  console.log(val);
}, 50);
`.trim(),
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

`.trim(),
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
`.trim(),
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
`.trim()
}