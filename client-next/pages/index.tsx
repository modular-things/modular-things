import Head from "next/head";
import { Flex } from "theme-ui";
import CodeMirror from "../components/CodeMirror";
import Editor from "../components/Editor";
import Toolbar from "../components/Toolbar";
import TabBar from "../ui/TabBar";

export default function Index() {
    return (
        <>
            <Head>
                <title>Modular Things</title>
                <meta name="description" content="Modular Things editor" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Flex sx={{
                flexDirection: "column",
                height: "100vh"
            }}>
                <Toolbar />
                <Flex sx={{ flex: 1 }}>
                    <Editor sx={{
                        flex: 1
                    }} />
                    <TabBar direction="vertical" tabs={["Devices", "All Views", "Drawing Machine", "Moving thing"]} selected={1} />
                </Flex>
            </Flex>
        </>
    );
}
