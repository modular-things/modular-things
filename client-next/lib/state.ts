import { EditorState } from "@codemirror/state";
import { createState } from "niue";
import { deserializeCMState } from "../components/CodeMirror";
import { FS, deserializeFS, FSNodeType, File, FSSerialized, serializeFS, getNodePath, pathToNode } from "./fs";
import type { rescan } from "./modularThingClient";

type Unpromisify<T> = T extends Promise<infer U> ? U : T;

export type OpenFile = {
    node: File,
    cmState: EditorState
};

export type GlobalState = {
    things: Unpromisify<ReturnType<typeof rescan>>,
    view?: HTMLDivElement | null | undefined,
    fs: FS,
    openFiles: OpenFile[],
    activeTab: number | null,
};

const initialFs: FS = deserializeFS([
    {
        type: FSNodeType.File,
        name: "index.js",
        content: `console.log("Hello, world!");`
    },
    // more files and folders for testing file tree
    {
        type: FSNodeType.Folder,
        name: "src",
        children: [
            {
                type: FSNodeType.File,
                name: "index.js",
                content: `console.log("Hello, world!");`
            },
            {
                type: FSNodeType.File,
                name: "index.html",
                content: `<!DOCTYPE html>`
            }
        ]
    },
    {
        type: FSNodeType.Folder,
        name: "public",
        children: [
            {
                type: FSNodeType.File,
                name: "index.html",
                content: `<!DOCTYPE html>`
            },
            {
                type: FSNodeType.Folder,
                name: "images",
                children: [
                    {
                        type: FSNodeType.File,
                        name: "logo.png",
                        content: ``
                    },
                    {
                        type: FSNodeType.File,
                        name: "favicon.ico",
                        content: ``
                    },
                    {
                        type: FSNodeType.Folder,
                        name: "icons",
                        children: []
                    }
                ]
            }
        ]
    }
]);

export const [useStore, patchStore] = createState<GlobalState>({
    things: {},
    view: undefined,
    fs: initialFs,
    openFiles: [],
    activeTab: null
});

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

export const deserializeState = (state: SerializedGlobalState): Partial<GlobalState> => {
    const fs = deserializeFS(state.fs);
    return {
        fs,
        openFiles: state.openFiles.map((oldOpenFile) => {
            const newOpenFile: OpenFile = {
                node: pathToNode(oldOpenFile.path, fs) as File,
                cmState: null!
            };
            newOpenFile.cmState = deserializeCMState(oldOpenFile.cmState, newOpenFile);
            return newOpenFile;
        }),
        activeTab: state.activeTab
    };
}

