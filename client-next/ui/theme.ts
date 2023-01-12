import type { Theme } from "theme-ui";
import { Atkinson_Hyperlegible, JetBrains_Mono } from "@next/font/google";

const atk = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"] });
export const jbMono = JetBrains_Mono({ subsets: ["latin"] });

export const theme: Theme = {
    fonts: {
        body: `${atk.style.fontFamily}, system-ui, sans-serif`,
        heading: `${atk.style.fontFamily}, system-ui, sans-serif`,
        monospace: `${jbMono.style.fontFamily}, Menlo, monospace`
    },
    fontSizes: [16, 18, 20, 24, 32, 48, 64, 96],
    colors: {
        text: "#000",
        background: "#fff",
        primary: "#33e",
        muted: "#e5e5e5",
    },
    styles: {
        root: {
            fontFamily: "body",
            lineHeight: "body",
            fontWeight: "body",
            backgroundColor: "background",
            color: "text",
            "& body": {
                minHeight: "100vh",
            },
            "& *": {
                fontFamily: "inherit"
            }
        },
        h1: {
            fontSize: 4,
            margin: 0
        },
        h2: {
            fontSize: 3,
            margin: 0
        },
        h3: {
            fontSize: 2,
            margin: 0,
        },
        h4: {
            fontSize: 1,
            margin: 0
        },
        h5: {
            fontSize: 0,
            margin: 0
        },
        h6: {
            fontSize: 0,
            margin: 0
        },
        p: {
            margin: 0
        },
        pre: {
            margin: 0,
            fontFamily: "monospace"
        },
        code: {
            fontFamily: "monospace"
        }
    },
    buttons: {
        primary: {
            transition: "all 0.1s ease-in-out",
        },
        secondary: {
            transition: "all 0.1s ease-in-out",
            color: "text",
            bg: "muted",
            "&:hover": {
                filter: "brightness(0.9)"
            }
        },
        icon: {
            bg: "muted",
            p: "0.25rem",
            transition: "all 0.1s ease-in-out",
            "&:hover": {
                filter: "brightness(0.9)"
            }
        }
    }
};
