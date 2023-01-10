import Head from "next/head";
import { Flex } from "theme-ui";
import CompatWarning from "../components/CompatWarning";
import Editor from "../components/Editor";
import Sidebar from "../components/Sidebar";
import Toolbar from "../components/Toolbar";

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
                <link rel="icon" href="favicon.ico" />
            </Head>
            <Flex sx={{
                flexDirection: "column",
                height: "100vh"
            }}>
                <Toolbar />
                <Flex sx={{ flex: 1, minHeight: 0 }}>
                    <Editor sx={{
                        flex: 1
                    }} />
                    <Sidebar />
                </Flex>
            </Flex>
            <CompatWarning />
        </>
    );
}
