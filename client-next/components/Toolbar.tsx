import { Button, Flex, Heading } from "theme-ui";
import download from "../lib/download";
import runCode from "../lib/run";
import { loadSerializedState, makeNewState, patchStore, serializeState, useStore } from "../lib/state";

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
            <DownloadButton />
            <NewButton />
            <OpenButton />
        </Flex>
    );
}

function RunButton() {
    return (
        <Button onClick={() => runCode()}>run (shift+enter)</Button>
    );
}

function DownloadButton() {
    const state = useStore();
    return (
        <Button onClick={() => download("project.mtjson", JSON.stringify(serializeState(state)))}>download</Button>
    );
}

function NewButton() {
    return (
        <Button onClick={() => {
            patchStore({
                ...makeNewState()
            })
        }}>new</Button>
    )
}

function OpenButton() {
    return (
        <Button onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".mtjson";
            input.onchange = () => {
                if(input.files?.length) {
                    const file = input.files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                        if(typeof reader.result === "string") {
                            loadSerializedState(JSON.parse(reader.result));
                        }
                    }
                    reader.readAsText(file);
                }
            }
            input.click();
        }}>open</Button>
    );
}