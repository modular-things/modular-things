import { signal } from '@preact/signals'

// type PanelType = "devices" | "view" | "help" | "none";

// type State = {
//   panelType: PanelType
// };

export const global_state = {
  panelType: signal("help"),
  things: signal({}),
  viewWindow: null,
  codemirror: null
}

