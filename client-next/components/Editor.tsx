import { DocumentBlank } from "@carbon/icons-react";
import { useState } from "react";
import { Box, Close, Flex, ThemeUIStyleObject } from "theme-ui";
import { useOnDeleteNode, useOnOpenFile } from "../lib/events";
import { FSNodeType } from "../lib/fs";
import { OpenFile, patchStore, useStore } from "../lib/state";
import TabBar from "../ui/TabBar";
import CodeMirror, { createCMState } from "./CodeMirror";

export default function Editor(props: { className?: string }) {
    const { openFiles, activeTab, fs } = useStore(["openFiles", "activeTab", "fs"]);

    useOnOpenFile((node) => {
        const existingIndex = openFiles.findIndex(f => f.node === node);
        if(existingIndex !== -1) {
            patchStore({
                activeTab: existingIndex
            });
        } else {
            const newOpenFile: OpenFile = {
                node,
                cmState: null!
            };
            newOpenFile.cmState = createCMState(newOpenFile);
            patchStore({
                openFiles: [...openFiles, newOpenFile],
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
            openFiles: openFiles.filter(v => v.node !== node)
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
                        }} tabs={openFiles.map(f => (
                            <>
                                {f.node.name}
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
                    }} openFile={activeTab !== null ? openFiles[activeTab] : undefined} />
                </>
            )}
        </Flex>
    )
}