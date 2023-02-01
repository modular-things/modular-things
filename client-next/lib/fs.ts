export enum FSNodeType {
    File,
    Folder
}

export type File = {
    type: FSNodeType.File;
    name: string;
    content: string;
    parent: Folder | null;
};

export type Folder = {
    type: FSNodeType.Folder;
    name: string;
    children: FSNode[];
    parent: Folder | null;
};

export type FSNode = File | Folder;

export type FileSerialized = {
    type: FSNodeType.File;
    name: string;
    content: string;
};

export type FolderSerialized = {
    type: FSNodeType.Folder;
    name: string;
    children: FSNodeSerialized[];
};

export type FSNodeSerialized = FileSerialized | FolderSerialized;

export type FS = FSNode[];
export type FSSerialized = FSNodeSerialized[];

export function deserializeFS(fs: FSSerialized, parent: Folder | null = null): FS {
    const mapFn = (node: FSNodeSerialized): FSNode => {
        const thisNode = { ...node, parent };
        if (thisNode.type === FSNodeType.File) {
            return thisNode;
        }
        thisNode.children = deserializeFS(thisNode.children, thisNode as Folder);
        return thisNode as Folder;
    };
    return fs.map(mapFn);
}

export function serializeFS(fs: FS): FSSerialized {
    return fs.map((node: FSNode) => {
        const serializedNode = { ...node } as FSNodeSerialized;
        //@ts-expect-error
        delete serializedNode.parent;
        if (node.type === FSNodeType.Folder) {
            (serializedNode as FolderSerialized).children = serializeFS(node.children);
        }
        return serializedNode;
    });
}


export const getNodePath = (node: FSNode) => {
    const path = [node.name];
    let parent = node.parent;
    while (parent) {
        path.push(parent.name);
        parent = parent.parent;
    }
    return path.reverse().join("/");
};

export const pathToNode = (path: string, fs: FS): FSNode => {
    const parts = path.split("/");
    if(parts[0] === "") parts.shift();
    let node: FSNode | undefined = { type: FSNodeType.Folder, children: fs } as FSNode;
    for (let part of parts) {
        if (node.type === FSNodeType.File) {
            throw new Error(`Could not find node ${part} in ${path}`);
        }
        node = (node as Folder).children.find(n => n.name === part);
        if (!node) {
            throw new Error(`Could not find node ${part} in ${path}`);
        }
    }
    return node!;
};
