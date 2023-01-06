import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Heading, Text } from "theme-ui";
import { patchStore, useStore } from "../lib/state";
import TabBar from "../ui/TabBar";
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
            {tab === 0 && <PanelWrapper><FileTree /></PanelWrapper>}
            {tab === 1 && <PanelWrapper><Devices /></PanelWrapper>}
            <PanelWrapper sx={{
                display: tab === 2 ? "initial" : "none"
            }}>
                <div ref={viewRef} />
            </PanelWrapper>
            <TabBar
                direction="vertical"
                tabs={["Files", "Devices", "View", "Help"]}
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


function Devices({ className }: { className?: string }) {
    const { things } = useStore(["things"]);

    return (
        <Flex className={className} sx={{
            flexDirection: "column",
            gap: "0.5em"
        }}>
            <Heading as="h2">List of Things</Heading>
            {Object.entries(things).map(([name, thing]) => (
                <Box key={name}>
                    <Flex sx={{
                        justifyContent: "space-between",
                        paddingBottom: "5px",
                        alignItems: "center"
                    }}>
                        <Heading as="h3">Name: {name}</Heading>
                        <Button>rename</Button>
                    </Flex>
                    <Text>Type: {thing.firmwareName}</Text>
                    <Box>
                        {thing.vThing.api.map((entry: any) => (
                            <Box key={entry.name} sx={{
                                paddingLeft: "25px",
                                paddingBottom: "5px",
                                color: "grey"
                            }}>
                                <div>{entry.name}({entry.args.map((x: string) => x.split(":")[0]).join(", ")})</div>
                                {entry.args.map((x: any, i: number) => <div key={i} sx={{ paddingLeft: "10px" }}>${x}</div>)}
                                {entry.return 
                                    ? <div sx={{
                                        paddingLeft: "10px",
                                        overflow: "scroll",
                                        whiteSpace: "nowrap"
                                    }}><b>returns:</b> ${entry.return}</div>
                                    : null
                                }
                            </Box>
                        ))}
                    </Box>
                </Box>
            ))}
            {Object.keys(things).length === 0 && <Text sx={{
                color: "gray"
            }}>no things found...</Text>}
        </Flex>
    )
}