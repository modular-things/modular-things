import { useState } from "react";
import { Button, Flex, Heading } from "theme-ui";
import download from "../lib/download";
import { rescan } from "../lib/modularThingClient";
import runCode from "../lib/run";
import { patchStore, useStore } from "../lib/state";
import { getCode } from "./CodeMirror";

export default function Toolbar() {
    return (
        <Flex bg="primary" color="white" px="0.5rem" py="0.25rem" sx={{
            alignItems: "center",
            "& > button": {
                border: "none",
                bg: "transparent",
                color: "inherit",
                "&:hover": {
                    bg: "rgba(255, 255, 255, 0.1)"
                }
            }
        }}>
            <Heading as="h1" sx={{ fontSize: "1.1rem" }} px="0.25rem">Modular Things</Heading>
            <RunButton />
            <ScanButton />
            <Button onClick={() => download("anon.js", getCode() ?? "")}>download</Button>
        </Flex>
    );
}

function RunButton() {
    const state = useStore(["things", "view"]);

    return (
        <Button onClick={() => runCode(getCode() ?? "", state)}>run (shift+enter)</Button>
    );
}

enum ScanState {
    Loading,
    Error,
    Idle
};

function ScanButton() {
    const [state, setState] = useState<ScanState>(ScanState.Idle);

    return (
        <Button disabled={state === ScanState.Loading} onClick={async () => {
            setState(ScanState.Loading);
            try {
                patchStore({
                    things: await rescan()
                });
                setState(ScanState.Idle);
            } catch(e) {
                setState(ScanState.Error);
                patchStore({
                    things: {}
                });
                console.error(e);
            }
        }}>
            scan
            {state === ScanState.Loading && "…"}
            {state === ScanState.Error && <span sx={{
                color: "red",
                ml: "0.25rem"
            }}>!</span>}
        </Button>
    );
}