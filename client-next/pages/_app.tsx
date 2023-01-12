import type { AppProps } from "next/app";
import { ThemeProvider } from "theme-ui";
import { theme } from "../ui/theme";
import GlobalStateDebugger from "../components/GlobalStateDebugger";
import { MDXProvider, useMDXComponents } from "@mdx-js/react";
import { useThemedStylesWithMdx } from "@theme-ui/mdx";

export default function App({ Component, pageProps }: AppProps) {
    const componentsWithStyles = useThemedStylesWithMdx(useMDXComponents());

    return (
        <ThemeProvider theme={theme}>
            <MDXProvider components={componentsWithStyles}>
                <GlobalStateDebugger />
                <Component {...pageProps} />
            </MDXProvider>
        </ThemeProvider>
    );
}
