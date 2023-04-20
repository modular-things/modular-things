import CodeMirror from './codemirror'
import TopMenu from './TopMenu'
import SideMenu from './SideMenu'
import ScanButton from './ScanButton'
import HelpMarkdown from "./HelpMarkdown.md"
import styles from "../styles/HelpMarkdown.module.css"

import * as acorn from 'acorn';
import { runCode } from "../lib/runCode";

import { useEffect, useState, useCallback } from 'preact/hooks'

import { init } from "../lib/init";
import { global_state } from "../lib/global_state";
import { signal } from '@preact/signals'
import { setThingsState } from "../lib/setThingsState";

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

    const search = window.location.search;
    const file = new URLSearchParams(search).get("file");
    if (file) {
      let file_url = file;
      if (!file.startsWith("http")) file_url = `examples/${file}`;
      fetch(file_url).then(async (res) => {
        const text = await res.text();

        const currentProg = cm.state.doc.toString();

        cm.dispatch({
          changes: { from: 0, to: currentProg.length, insert: text }
        });

        global_state.panelType.value = "view";
        document.documentElement.style.setProperty("--cm-width", `1%`);
        document.querySelector(".run-button").click();
      });
    }

    initialized = true;


  });

  const viewRef = useCallback(node => {
    global_state.viewWindow = node;
  })

  return (
    <div class="root">
      <TopMenu />
      <div class="content">
        <div class="not-menu-content">
          <CodeMirror />
          <div class="divider"></div>
          <div class="right-panel">
            {global_state.panelType.value === "devices" && rightPanels["devices"](global_state.things.value)}
            {global_state.panelType.value === "help" && rightPanels["help"]()}
            {global_state.panelType.value === "console" && rightPanels["console"](global_state.logs.value)}
            <div ref={viewRef} style={{
              display: global_state.panelType.value === "view" ? "block" : "none",
              height: "100%",
              width: "100%",
              overflow: "hidden"
            }}></div>
          </div>
        </div>
        <SideMenu />
      </div>
    </div>
  )
}

const rightPanels = {
  "devices": (things) => (
    <div class="device-panel">
      <div class="device-title">List of Things</div>
      <div class="device-buttons">
        <div class="device-button-container">
          <ScanButton />
        </div>
        <div class="device-button-container">
          <button class="device-button pair-button-trigger">pair new thing</button>
        </div>
        <div class="device-button-container">
          <button class="device-button disconnect-button-trigger">disconnect all</button>
        </div>
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
  "console": (logs) => {
    return (
      <div class="console-panel" style="padding:1%; height:100%;">
        <h3>
          Console
        </h3>
        <div class="console-content">
          {logs.map((x, i) => (
            <>
              <hr style={{ "color": "black" }} />
              <div key={i}>{x}</div>
            </>
          ))}
        </div>
        <hr />
        <div class="console-input">
          <input type="text"
            style={{ "background-color": "transparent", "border": "none", "outline": "none", "color": "black", "font-size": "1em", width: "100%", "padding": "5px" }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                const text = e.target.value;
                e.target.value = "";
                let current_code = global_state.codemirror.state.doc.toString();

                const parsedCode = acorn.parse(current_code, { ecmaVersion: "latest" });
                const functionDeclarations = parsedCode.body.filter(
                  (node) => node.type === "FunctionDeclaration"
                );

                let functionString = "";

                for (const declaration of functionDeclarations) {
                  functionString += current_code.slice(
                    declaration.start,
                    declaration.end
                  ) + "\n";
                }

                runCode(functionString + text);
              }
            }}
            onblur={(e) => {
              // check if click is on console
              console.log(e.relatedTarget?.className)
              if (e.relatedTarget?.className === "cm-content") return;
              document.querySelector(".console-input input").focus()
            }}
            autofocus
          />
        </div>
      </div>
    )
  },
  "help": (helpMd) => (
    <div class={styles.md} style={{ padding: 10 }} dangerouslySetInnerHTML={{ __html: htmlString }}></div>
  ),
}

function drawThing([name, thing]) {
  console.log(`drawThing`, name, thing)
  // TODO: this is modified since.... 
  const renameThing = async () => {
    console.error(`expect an error, this is old code...`)
    const newName = prompt(`New name for ${name}`);
    if (!newName) return;
    await thing.vThing.setName(newName);
    const things = global_state.things.value;
    delete things[name];
    things[newName] = thing;

    setThingsState(things);
  }

  return (
    <div key={name} style={{ "font-size": "1.1em", "padding-top": "5px" }}>
      <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center" }}>
        <div style={{ "font-weight": "bold", "font-size": "1.05em" }}>name: {name}</div>
        <button class="device-button" style={{ "font-size": ".9em", "width": 100 }} onClick={renameThing}>rename</button>
      </div>
      <div>type: {thing.typeName}</div>
      {thing.api.map(drawApi)}
      <hr style={{ "color": "black" }} />
    </div>
  )
}

function drawApi(entry) {

  const containerStyle = {
    "font-size": "1em",
    "padding-left": "1em",
    "padding-bottom": ".5em",
    "color": "grey"
  }

  const argOrReturnStyle = {
    "padding-left": "1em",
    "overflow": "scroll",
    "white-space": "nowrap"
  };

  return (
    <div key={entry.name} style={containerStyle}>
      <div>{entry.name}({entry.args.map(x => x.split(":")[0]).join(", ")})</div>
      {entry.args.map((x, i) => <div key={i} style={argOrReturnStyle}>{x}</div>)}
      {entry.return
        ? <div style={argOrReturnStyle}><b>returns:</b> {entry.return}</div>
        : null
      }
    </div>
  )
}
