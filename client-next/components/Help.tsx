import { Flex, Heading } from "theme-ui";
import HelpContents from "./HelpContents.mdx";

export default function Help() {
    return (
        <Flex sx={{
            flexDirection: "column",
            gap: "0.5rem"
        }}>
            <HelpContents />
        </Flex>
    )
}