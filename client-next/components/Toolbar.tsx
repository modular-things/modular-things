import { Button, Flex, Heading } from "theme-ui";

export default function Toolbar() {
    return (
        <Flex bg="primary" color="white" px="0.5rem" py="0.25rem" sx={{
            alignItems: "center",
            "& > button": {
                border: "none",
                bg: "transparent",
                color: "inherit",
                "&:hover": {
                    bg: "rgba(255, 255, 255, 0.1)"
                }
            }
        }}>
            <Heading as="h1" sx={{ fontSize: "1.1rem" }} px="0.25rem">Modular Things</Heading>
            <Button>run (shift+enter)</Button>
            <Button>scan</Button>
            <Button>download</Button>
        </Flex>
    )
}