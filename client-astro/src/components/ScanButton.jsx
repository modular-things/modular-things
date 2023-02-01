import { global_state } from "../lib/global_state";
import { useState } from 'preact/hooks'
import { rescan } from "../lib/modularThingClient";

export default function ScanButton() {
  const [scanState, setScanState] = useState("idle");

  const scan = async () => {
    setScanState("loading");
    try {
      await rescan();
      setScanState("idle");
    } catch(e) {
      setScanState("error");
      global_state.things.value = {};
      console.error(e);    
    }
  }

  const errorStyle = {
    color: "red",
    marginLeft: "0.25rem"
  }

  return (
      <button 
        class="device-button" 
        disabled={scanState === "loading"} onClick={scan}>
          scan
          {scanState === "loading" && "…"}
          {scanState === "error" && <span style={errorStyle}>!</span>}
      </button>
  );
}