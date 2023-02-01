import { useEffect, useState } from "react";
import { Box, Button, Heading, Paragraph } from "theme-ui";

export default function CompatWarning() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        setShow(!navigator.serial);
    }, []);

    return show ? (
        <Box sx={{
            position: "fixed",
            top: "0",
            bottom: "0",
            left: "0",
            right: "0",
            zIndex: 100,
            bg: "rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <Box role="dialog" aria-labelledby="compatTitle" aria-describedby="compatDesc" sx={{
                bg: "white",
                borderRadius: "0.25rem",
                padding: "1rem",
                mx: "1rem",
                maxWidth: "35rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
            }}>
                <Heading as="h2" id="compatTitle">Incompatible browser</Heading>
                <Paragraph id="compatDesc">Your browser doesn't seem to support the Web Serial API, which is required for Modular Things to be able to connect to hardware. You can still use the site to write code, but for full functionality, use Chrome or Edge version 89 or above.</Paragraph>
                <Box sx={{
                    display: "flex",
                    justifyContent: "flex-end"
                }}>
                    <Button onClick={() => setShow(false)}>Continue</Button>
                </Box>
            </Box>
        </Box>
    ) : null;
}