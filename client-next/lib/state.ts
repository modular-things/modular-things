import { createState } from "niue";
import { FS, deserializeFS, FSNodeType, FSNode } from "./fs";
import type { rescan } from "./modularThingClient";

type Unpromisify<T> = T extends Promise<infer U> ? U : T;

export type GlobalState = {
    things: Unpromisify<ReturnType<typeof rescan>>,
    view?: HTMLDivElement | null | undefined,
    fs: FS,
    openFiles: FSNode[],
    activeTab: number | null
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
    openFiles: [initialFs[0]],
    activeTab: 0
});