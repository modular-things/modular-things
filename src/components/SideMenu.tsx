import styles from '../styles/SideMenu.module.css'
import { global_state } from "../lib/global_state";

export default function SideMenu() {
  return (
    <div class={[styles["side-menu"], "prevent-select"].join(" ")}>
      <div 
        class={getStyle("devices")}
        onClick={() => { 
          openPanel();
          togglePanel("devices");
          closePanel();
        }}>
        Devices
        </div>
      <div 
        class={getStyle("view")} 
        onClick={() => { 
          openPanel();
          togglePanel("view");
          closePanel();
        }}>
        View
        </div>
<!--       <div 
        class={getStyle("console")}
        onClick={() => { 
          openPanel();
          togglePanel("console");
          closePanel();
        }}>
        Console
        </div> -->
      <div 
        class={getStyle("help")} 
        onClick={() => { 
          openPanel();
          togglePanel("help");
          closePanel();
        }}>
        Help
        </div>
    </div>
  )
}


function getStyle(name) {
  return [
    styles["menu-item"], 
      global_state.panelType.value === name
        ? styles["selected-menu-item"]
        : ""
  ].join(" ");
}

function openPanel() {
  if (global_state.panelType.value === "none")
    document.documentElement.style.setProperty("--cm-width", `70%`);
}

function closePanel() {
  if (global_state.panelType.value === "none")
    document.documentElement.style.setProperty("--cm-width", `100%`);
}

function togglePanel(name) {
  global_state.panelType.value = 
    global_state.panelType.value === name
    ? "none"
    : name;
}
