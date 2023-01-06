import { useState } from "react";
import { Box, Close, Flex, ThemeUIStyleObject } from "theme-ui";
import { useOnDeleteNode, useOnOpenFile } from "../lib/events";
import { FSNodeType } from "../lib/fs";
import { patchStore, useStore } from "../lib/state";
import TabBar from "../ui/TabBar";
import CodeMirror from "./CodeMirror";

export default function Editor(props: { className?: string }) {
    const { openFiles, activeTab, fs } = useStore(["openFiles", "activeTab", "fs"]);

    useOnOpenFile((file) => {
        if(openFiles.includes(file)) {
            patchStore({
                activeTab: openFiles.indexOf(file)
            });
        } else {
            patchStore({
                openFiles: [...openFiles, file],
                activeTab: openFiles.length
            });
        }
    }, [openFiles]);

    useOnDeleteNode((node) => {
        if(node.type === FSNodeType.Folder) return;
        if(activeTab !== null && activeTab > openFiles.length - 2) {
            patchStore({
                activeTab: openFiles.length - 2
            });
        }
        patchStore({
            openFiles: openFiles.filter(v => v !== node)
        });
    }, [openFiles, activeTab]);

    return (
        <Flex sx={{ flexDirection: "column" }} className={props.className}>
            <Box sx={{
                overflowX: "auto"
            }}>
                <TabBar sx={{
                    width: "max-content",
                    minWidth: "100%"
                }} tabs={openFiles.map(n => (
                    <>
                        {n.name}
                        <Close sx={{
                            // padding: "0.25rem",
                            padding: 0,
                            margin: 0,
                            ml: "0.25rem",
                            width: "1rem",
                            height: "1rem",
                            "&:hover": {
                                bg: "white"
                            }
                        }} onClick={(e) => {
                            e.stopPropagation();
                            patchStore({
                                openFiles: openFiles.filter(v => v !== n)
                            });
                            if(activeTab !== null && activeTab > openFiles.length - 2) {
                                patchStore({
                                    activeTab: openFiles.length - 2
                                });
                            }
                        }} />
                    </>
                ))} selected={activeTab} onSelect={v => v !== null && patchStore({
                    activeTab: v
                })} />
            </Box>
            <CodeMirror sx={{
                flex: 1
            }} />
        </Flex>
    )
}