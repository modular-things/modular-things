import { global_state } from "./global_state";

export function setThingsState(things) {
  global_state.things.value = {};
  global_state.things.value = things;
}