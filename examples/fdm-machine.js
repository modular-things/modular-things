import { html, svg, render } from "https://unpkg.com/lit-html@2.6.1/lit-html.js";

await hotend.setConfig({
  delT: 0.01,
  pTerm: 0.1,
  iTerm: 0.0,
  iLim: 50.0,
  dTerm: 0.0,
  tempAlpha: 0.05
})

const view = (state) => html`
<div style="padding-left: 10px">
<p>
sp: ${state.setPoint.toFixed(2)}<br>
temp: ${state.tempEstimate.toFixed(2)}<br>
outp: ${state.output.toFixed(2)}<br>
</p>
</div>
`

let update = async () => {
  let states = await hotend.getStates();
  render(view(states), viewWindow);
  setTimeout(update, 100);
}

update();

await hotend.setTemperature(120);

await hotend.setPCF(0.25);