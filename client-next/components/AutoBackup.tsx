import { useEffect } from "react";
import { useStore, serializeState, getStore } from "../lib/state";
import { useOnCMChange } from "./CodeMirror";

function backup() {
    const backup = serializeState(getStore());
    localStorage.setItem("backup", JSON.stringify(backup));
}

export default function AutoBackup() {
    useStore();

    useOnCMChange(backup, []);
    useEffect(backup);

    return null;
}