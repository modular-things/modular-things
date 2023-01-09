import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "theme-ui";
import { patchStore } from "../lib/state";
import TabBar from "../ui/TabBar";
import Devices from "./Devices";
import FileTree from "./FileTree";

export default function Sidebar() {
    const [tab, setTab] = useState<number | null>(0);
    const viewRef = useCallback((node: HTMLDivElement) => {
        patchStore({
            view: node
        });
    }, []);

    return (
        <>
            {tab === 1 && <PanelWrapper><FileTree /></PanelWrapper>}
            {tab === 0 && <PanelWrapper><Devices /></PanelWrapper>}
            <PanelWrapper sx={{
                display: tab === 2 ? "initial" : "none"
            }}>
                <div ref={viewRef} />
            </PanelWrapper>
            <TabBar
                direction="vertical"
                tabs={["Devices", "Files", "View"/*, "Help"*/]}
                selected={tab}
                onSelect={(tab) => setTab(tab)}
                sx={{
                    borderRight: "none"
                }}
            />
        </>
    )
}

function PanelWrapper({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <Box className={className} sx={{
            flexDirection: "column",
            margin: "0.25rem",
            border: "1px solid",
            borderColor: "muted",
            borderRadius: "0.25rem",
            padding: "0.25rem",
            minWidth: "20vw",
            maxWidth: "50vw"
        }}>
            {children}
        </Box>
    );
}