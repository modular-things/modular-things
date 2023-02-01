import CodeMirror from './codemirror'
import TopMenu from './TopMenu'
import SideMenu from './SideMenu'

import { useEffect } from 'preact/hooks'

import { addEvents } from "../lib/addEvents";
import { global_state } from "../lib/global_state";

let initialized = false;
export default function Page() {
  useEffect(() => {
    if (initialized) return;
    addEvents(global_state);

    const cache = window.localStorage.getItem("cache");
    const cm = global_state.codemirror;
    cm.dispatch({
      changes: { from: 0, insert: cache ?? "" }
    });

    initialized = true;
  });

  return (
    <div class="root">
      <TopMenu/>
      <div class="content">
        <div class="not-menu-content">
          <CodeMirror />
          <div class="divider"></div>
          <div class="right-panel">{rightPanels[global_state.panelType]}</div>
        </div>
        <SideMenu/>
      </div>
    </div>
  )
}

const rightPanels = {
  "devices": (
    <div class="device-panel">
      <div class="device-title">List of Things</div>
      <div class="device-button-container">
        <button class="device-button">scan</button>
      </div>
      <div class="device-button-container">
        <button class="device-button">pair new thing</button>
      </div>
      {global_state.things.value.length > 1 
        ? global_state.things.value.map(drawThing)
        : <div class="no-things">
            <div>no things found...</div>
            <div>(maybe try scanning or pairing?)</div>
          </div>
      }
    </div>
  ),
  "view": (
    <div class="view-window"></div>
  ),
  "help": (
    <div>
      help
    </div>
  ),
  "none": ""
}

function drawThing(thing) {
  return (
    <div>thing is: {thing}</div>
  )
}