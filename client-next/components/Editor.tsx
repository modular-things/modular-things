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
            {openFiles.length === 0 ? (
                <Box>
                    nothign is open,,,,
                </Box>
            ) : (
                <>
                    <Box sx={{
                        overflowX: "auto"
                    }}>
                        <TabBar hasClose sx={{
                            width: "max-content",
                            minWidth: "100%"
                        }} tabs={openFiles.map(n => (
                            <>
                                {n.name}
                            </>
                        ))} selected={activeTab} onSelect={v => v !== null && patchStore({
                            activeTab: v
                        })} onClose={(i) => {
                            const n = openFiles[i];
                            patchStore({
                                openFiles: openFiles.filter(v => v !== n)
                            });
                            if(activeTab !== null && activeTab > openFiles.length - 2) {
                                patchStore({
                                    activeTab: openFiles.length - 2
                                });
                            }
                        }} />
                    </Box>
                    <CodeMirror sx={{
                        flex: 1
                    }} />
                </>
            )}
        </Flex>
    )
}