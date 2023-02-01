import { createEvent } from "niue";
import { File, Folder, FSNode, FSNodeType } from "./fs";

export const [useOnOpenFile, dispatchOpenFile] = createEvent<File>();
export const [useOnDeleteNode, dispatchDeleteNode] = createEvent<FSNode>();