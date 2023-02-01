import { EditorState } from "@codemirror/state";
import { createState } from "niue";
import { createCMState, deserializeCMState } from "../components/CodeMirror";
import { FS, deserializeFS, FSNodeType, File, FSSerialized, serializeFS, getNodePath, pathToNode } from "./fs";
import type { Thing } from "./modularThingClient";

export type OpenFile = {
    node: File,
    cmState: EditorState
};

export type GlobalState = {
    things: Record<string, Thing>,
    view?: HTMLDivElement | null | undefined,
    fs: FS,
    openFiles: OpenFile[],
    activeTab: number | null,
};

export const makeNewState = () => {
    const initialFs: FS = deserializeFS([
        {
            type: FSNodeType.File,
            name: "index.js",
            content: `// welcome to modular things!

// if you have some things, plug them in
// and head to the devices panel to pair
// them and see API docs

// this is a fun little demo showing
// some of the capabilities of the editor

import { html, render as uRender } from "https://cdn.skypack.dev/uhtml/async";

const div = html\`
<div>hello, world!</div>
<button onclick=\${async () => {
  // you can use ES imports!
  const { default: confetti } = await import("https://cdn.skypack.dev/canvas-confetti");
  confetti();
}}>celebrate!</button>
\`;

uRender(viewEl, div);`
        }
    ]);
    
    const initialOF: OpenFile = {
        node: initialFs[0] as File,
        cmState: null!
    };
    initialOF.cmState = createCMState(initialOF);
    return {
        fs: initialFs,
        openFiles: [initialOF],
        activeTab: 0
    };
};

export type SerializedOpenFile = {
    path: string,
    cmState: any
};

export type SerializedGlobalState = {
    fs: FSSerialized,
    openFiles: SerializedOpenFile[],
    activeTab: number | null,
    formatVersion: 0
};

export const serializeState = (state: GlobalState): SerializedGlobalState => {
    return {
        fs: serializeFS(state.fs),
        openFiles: state.openFiles.map((openFile) => ({
            path: getNodePath(openFile.node),
            cmState: openFile.cmState.toJSON()
        })),
        activeTab: state.activeTab,
        formatVersion: 0
    };
}

export function loadSerializedState(state: SerializedGlobalState) {
    patchStore(deserializeState(state));
    // dispatchCMResetState();
}

const deserializeState = (state: SerializedGlobalState): Partial<GlobalState> => {
    const fs = deserializeFS(state.fs);
    return {
        fs,
        openFiles: state.openFiles.map(o => deserializeOpenFile(o, fs)),
        activeTab: state.activeTab
    };
}

function deserializeOpenFile(oldOpenFile: SerializedOpenFile, fs: FS): OpenFile {
    const newOpenFile: OpenFile = {
        node: pathToNode(oldOpenFile.path, fs) as File,
        cmState: null!
    };
    newOpenFile.cmState = deserializeCMState(oldOpenFile.cmState, newOpenFile);
    return newOpenFile;
}



const backup = typeof window !== "undefined" && localStorage.getItem("backup");
const initialFs = backup ? deserializeState(JSON.parse(backup)) : makeNewState();

export const [useStore, patchStore, getStore] = createState<GlobalState>({
    things: {},
    view: undefined,
    ...initialFs
} as GlobalState);
