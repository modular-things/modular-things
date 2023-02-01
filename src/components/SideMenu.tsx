import styles from '../styles/SideMenu.module.css'
import { global_state } from "../lib/global_state";

export default function SideMenu() {
  return (
    <div class={[styles["side-menu"], "prevent-select"].join(" ")}>
      <div 
        class={[
          styles["menu-item"], 
          global_state.panelType.value === "devices" 
            ? styles["selected-menu-item"]
            : ""
          ].join(" ")}
        onClick={() => { 
          if (global_state.panelType.value === "none")
            document.documentElement.style.setProperty("--cm-width", `70%`);

          global_state.panelType.value = 
            global_state.panelType.value === "devices"
            ? "none"
            : "devices";

          if (global_state.panelType.value === "none")
            document.documentElement.style.setProperty("--cm-width", `100%`);
        }}>
        Devices
        </div>
      <div 
        class={[
          styles["menu-item"], 
          global_state.panelType.value === "view" 
            ? styles["selected-menu-item"]
            : ""
          ].join(" ")} 
        onClick={() => { 
          if (global_state.panelType.value === "none")
            document.documentElement.style.setProperty("--cm-width", `70%`);

          global_state.panelType.value = 
            global_state.panelType.value === "view"
            ? "none"
            : "view";

          if (global_state.panelType.value === "none")
            document.documentElement.style.setProperty("--cm-width", `100%`);
        }}>
        View
        </div>
      <div 
        class={[
          styles["menu-item"], 
          global_state.panelType.value === "help" 
            ? styles["selected-menu-item"]
            : ""
          ].join(" ")} 
        onClick={() => { 
          if (global_state.panelType.value === "none")
            document.documentElement.style.setProperty("--cm-width", `70%`);

          global_state.panelType.value = 
            global_state.panelType.value === "help"
            ? "none"
            : "help";

          if (global_state.panelType.value === "none")
            document.documentElement.style.setProperty("--cm-width", `100%`);
        }}>
        Help
        </div>
    </div>
  )
}