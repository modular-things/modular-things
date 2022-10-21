import { global_state } from "../global_state.js";

export async function addThing(name, thing) {
  console.log("add", name, thing);
  await thing.vThing.setup();
  global_state.things[name] = thing;
}  