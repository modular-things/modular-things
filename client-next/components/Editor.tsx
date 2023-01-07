import { DocumentBlank } from "@carbon/icons-react";
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
                <Box sx={{
                    padding: "1rem",
                    pl: "2rem",
                    color: "gray",
                }}>
                    <DocumentBlank size="glyph" sx={{
                        width: "100px",
                        display: "block",
                        pb: "1rem",
                        ml: "-18.68333333px" // (100px - width of actual icon path) / 2
                    }} />
                    there's nothing open right now
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