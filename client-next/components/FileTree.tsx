import { Box, Button, Flex, IconButton, ThemeUIStyleObject } from "theme-ui";
import { useStore, patchStore } from "../lib/state";
import { FSNode, FSNodeType, Folder, File } from "../lib/fs";
import { DocumentAdd, FolderAdd, TrashCan, Document, Folder as FolderIcon, Edit } from "@carbon/icons-react";
import { createState } from "niue";
import { dispatchDeleteNode, dispatchOpenFile } from "../lib/events";

const [useTreeState, patchTreeState] = createState<{
    selected: FSNode | null,
}>({
    selected: null,
});

const BUTTON_ICON_SIZE = 20;

export default function FileTree() {
    const { fs } = useStore();
    const { selected } = useTreeState();
    console.log("rerender");

    return (
        <Flex sx={{
            flexDirection: "column",
            gap: "0.5rem",
            height: "100%"
        }} onClick={() => {
            patchTreeState({
                selected: null
            });
        }}>
            <Flex sx={{
                // right align
                justifyContent: "flex-end",
                gap: "0.5rem"
            }}>
                <IconButton aria-label="Add file" onClick={(e) => {
                    e.stopPropagation();
                    // add file at selected node (if file is selected then its parent, otherwise selected node)
                    // TODO better way to input name
                    const name = prompt("Enter file name");
                    if(name) {
                        const parent = selected?.type === FSNodeType.File ? selected.parent : selected;
                        const parentArr = parent?.children ?? fs;
                        const newFile: File = {
                            type: FSNodeType.File,
                            name,
                            content: "",
                            parent
                        };
                        parentArr.push(newFile);
                        console.log("patchstore");
                        patchStore(["fs"]);
                        dispatchOpenFile(newFile);
                        patchTreeState({
                            selected: newFile
                        });
                    }
                }}>
                    <DocumentAdd size={BUTTON_ICON_SIZE} />
                </IconButton>
                <IconButton aria-label="Add folder" onClick={(e) => {
                    e.stopPropagation();
                    // add folder at selected node (if file is selected then its parent, otherwise selected node)
                    // TODO better way to input name
                    const name = prompt("Enter folder name");
                    if(name) {
                        const parent = selected?.type === FSNodeType.File ? selected.parent : selected;
                        const parentArr = parent?.children ?? fs;
                        const newFolder: Folder = {
                            type: FSNodeType.Folder,
                            name,
                            children: [],
                            parent
                        };
                        parentArr.push(newFolder);
                        patchStore(["fs"]);
                        patchTreeState({
                            selected: newFolder
                        });
                    }
                }}>
                    <FolderAdd size={BUTTON_ICON_SIZE} />
                </IconButton>
                <IconButton aria-label="Rename" onClick={(e) => {
                    e.stopPropagation();
                    // TODO better way to input name
                    const name = prompt("Enter new name");
                    if(selected && name) {
                        selected.name = name;
                        patchStore(["fs"]);
                    }
                }}>
                    <Edit size={BUTTON_ICON_SIZE} />
                </IconButton>
                <IconButton aria-label="Delete" onClick={(e) => {
                    e.stopPropagation();
                    // use confirm dialog
                    // TODO better way to confirm
                    if(selected && confirm(`Are you sure you want to delete "${selected.name}"?`)) {
                        const parent = selected.parent;
                        const parentArr = parent?.children ?? fs;
                        const index = parentArr.indexOf(selected);
                        if(index !== -1) {
                            parentArr.splice(index, 1);
                            patchStore(["fs"]);
                            dispatchDeleteNode(selected);
                            patchTreeState({
                                selected: null
                            });
                        }
                    }
                }}>
                    <TrashCan size={BUTTON_ICON_SIZE} />
                </IconButton>
            </Flex>
            <TreeNodeCollection nodes={fs} root />
        </Flex>
    )
}

const treeNodeStyles: (selected: boolean) => ThemeUIStyleObject = (selected) => ({
    display: "flex",
    color: "text",
    bg: selected ? "muted" : "transparent",
    py: "0.25rem",
    alignItems: "center",
    "& > svg": {
        mr: "0.25rem"
    },
    "&:hover": selected ? {
        filter: "brightness(0.9)"
    } : {
        bg: "muted"
    }
});

const treeNodeCollectionStyles: ThemeUIStyleObject = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem"
};

function TreeFSNode({ node }: { node: FSNode }) {
    const { selected } = useTreeState();

    return (
        <>
            <Button sx={treeNodeStyles(selected === node)} onClick={(e) => {
                e.stopPropagation();
                patchTreeState({
                    selected: selected === node ? null : node
                });
                if(node.type === FSNodeType.File && selected !== node) {
                    dispatchOpenFile(node);
                }
            }}>
                {node.type === FSNodeType.File ? <Document /> : <FolderIcon />}
                {node.name}
            </Button>
            {node.type === FSNodeType.Folder && node.children.length > 0 && (
                <TreeNodeCollection nodes={node.children} sx={{
                    ml: "1rem"
                }} />
            )}
        </>
    );
}

// TODO alphabetical sort
function TreeNodeCollection({ nodes, className, root }: { nodes: FSNode[], className?: string, root?: boolean }) {
    return (
        <Box className={className} sx={treeNodeCollectionStyles} onClick={root ? e => { e.stopPropagation(); } : undefined}>
            {nodes.map((node) => (
                <TreeFSNode key={node.name} node={node} />
            ))}
        </Box>
    )
}