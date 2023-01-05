import { createState } from "niue";
import type { rescan } from "./modularThingClient";

type Unpromisify<T> = T extends Promise<infer U> ? U : T;

export type GlobalState = {
    things: Unpromisify<ReturnType<typeof rescan>>,
    view?: HTMLDivElement | null | undefined
};

export const [useStore, patchStore] = createState<GlobalState>({
    things: {},
    view: undefined
});