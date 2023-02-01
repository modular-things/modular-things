import CodeMirror from './codemirror'
import TopMenu from './TopMenu'
import SideMenu from './SideMenu'
import ScanButton from './ScanButton'
import HelpMarkdown from "./HelpMarkdown.md"
// how to load this markdown

import { useEffect, useState, useCallback } from 'preact/hooks'

import { init } from "../lib/init";
import { global_state } from "../lib/global_state";

const md = await HelpMarkdown();
const htmlString = md.props.children.toString();

let initialized = false;
export default function Page() {
  useEffect(() => {
    if (initialized) return;
    init(global_state);

    const cache = window.localStorage.getItem("cache");
    const cm = global_state.codemirror;
    cm.dispatch({
      changes: { from: 0, insert: cache ?? "" }
    });

    initialized = true;


  });

  const viewRef = useCallback(node => {
    global_state.viewWindow = node;
  })

  return (
    <div class="root">
      <TopMenu/>
      <div class="content">
        <div class="not-menu-content">
          <CodeMirror />
          <div class="divider"></div>
          <div class="right-panel">
            {global_state.panelType.value === "devices" && rightPanels["devices"](global_state.things.value)}
            {global_state.panelType.value === "help" && rightPanels["help"]()}
            <div ref={viewRef} style={{ display: global_state.panelType.value === "view" ? "block" : "none" }}></div>
          </div>
        </div>
        <SideMenu/>
      </div>
    </div>
  )
}

const rightPanels = {
  "devices": (things) => (
    <div class="device-panel">
      <div class="device-title">List of Things</div>
      <div class="device-button-container">
        <ScanButton/>
      </div>
      <div class="device-button-container">
        <button class="device-button pair-button-trigger">pair new thing</button>
      </div>
      {Object.entries(things).length > 0 
        ? Object.entries(things).map(drawThing)
        : <div class="no-things">
            <div>no things found...</div>
            <div>(maybe try scanning or pairing?)</div>
          </div>
      }
    </div>
  ),
  "help": (helpMd) => (
    <div style={{ padding: 10 }} dangerouslySetInnerHTML={{ __html: htmlString }}></div>
  ),
}

function drawThing([name, thing]) {
  const renameThing = async () => {
      const newName = prompt(`New name for ${name}`);
      if (!newName) return;
      await thing.vThing.setName(newName);
      const things = global_state.things.value;
      delete things[name];
      things[newName] = thing;

      // set things state
      global_state.things.value = {};
      global_state.things.value = things;
  }

  return (
    <div key={name} style={{ "font-size": "1.1em", "padding-top": "5px" }}>
      <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center" }}>
        <div style={{ "font-weight": "bold", "font-size": "1.05em"}}>name: {name}</div>
        <button class="device-button" style={{ "font-size": ".9em", "width": 100 }} onClick={renameThing}>rename</button>
      </div>
      <div>type: {thing.firmwareName}</div>
      {thing.vThing.api.map(drawApi)}
      <hr style={{ "color": "black" }}/>
    </div>
  )
}

function drawApi(entry) {
  const argOrReturnStyle = { 
    "padding-left": "1em", 
    "overflow": "scroll", 
    "white-space": "nowrap" 
  };

  return (
    <div key={entry.name} style={{ "font-size": "1em", "padding-left": "1em", "padding-bottom": ".5em", color: "grey" }}>
      <div>{entry.name}({entry.args.map(x => x.split(":")[0]).join(", ")})</div>
      {entry.args.map((x, i) => <div key={i} style={argOrReturnStyle}>{x}</div>)}
      {entry.return
          ? <div style={argOrReturnStyle}><b>returns:</b> {entry.return}</div>
          : null
      }
    </div>
  )
}