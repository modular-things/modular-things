import { useState } from "react";
import { Flex, ThemeUIStyleObject } from "theme-ui";
import TabBar from "../ui/TabBar";
import CodeMirror from "./CodeMirror";

export default function Editor(props: { className?: string }) {
    const [openTab, setOpenTab] = useState<number | null>(0);

    return (
        <Flex sx={{ flexDirection: "column" }} className={props.className}>
            <TabBar tabs={["test", "test2", "test3"]} selected={openTab} onSelect={setOpenTab} />
            <CodeMirror sx={{
                flex: 1
            }} />
        </Flex>
    )
}