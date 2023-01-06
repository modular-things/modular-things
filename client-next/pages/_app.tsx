import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "theme-ui";
import { theme } from "../ui/theme";
import GlobalStateDebugger from "../components/GlobalStateDebugger";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider theme={theme}>
            <GlobalStateDebugger />
            <Component {...pageProps} />
        </ThemeProvider>
    );
}
