import { EditorView, basicSetup } from "codemirror"
import { keymap, ViewUpdate } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript"
import { EditorState, StateField } from "@codemirror/state";
import { syntaxTree, indentUnit } from "@codemirror/language";
import { indentWithTab } from "@codemirror/commands";
import { useCallback, useEffect, useState } from "react";
import { OpenFile } from "../lib/state";

const countDocChanges = StateField.define({
  create(state) {
    return 0;
  },
  update(value, transaction) {
    if (transaction.docChanged) {
      const { state } = transaction;
      const ast = syntaxTree(state);
      return value + 1;
    } else {
      return value;
    }
  },
  provide(field) {
    return [];
  }
});

// this is a terrible hack but strange bugs are about this one
//@ts-expect-error
const autocompleteRemoved = basicSetup.filter((_, i) => ![11, 12].includes(i));

export function getCode() {
  return (document.querySelector(".cm-editor") as (Element & {
    view: EditorView
  }) | undefined)?.view.state.doc.toString();
}

const cmExtensions = (openFile: OpenFile) => [
  autocompleteRemoved,
  javascript(),
  keymap.of([indentWithTab]), // TODO: We should put a note about Esc+Tab for accessibility somewhere.
  indentUnit.of("  "),
  // countDocChanges,
  EditorView.updateListener.of((v: ViewUpdate) => {
    openFile.cmState = v.state;
    if(v.docChanged) openFile.node.content = v.state.doc.toString();
  })
];

export const createCMState = (openFile: OpenFile) => EditorState.create({ extensions: cmExtensions(openFile), doc: openFile.node.content });

export const deserializeCMState = (state: any, openFile: OpenFile) => EditorState.fromJSON(state, { extensions: cmExtensions(openFile) });

export default function CodeMirror({ className, openFile }: { className?: string, openFile?: OpenFile }) {
  const [view, setView] = useState<EditorView>();

  useEffect(() => {
    // console.log("cm effect", view, openFile);
    if(!view || !openFile) return;
    view.setState(openFile.cmState);
  }, [view, openFile]);

  const editorRef = useCallback((node: HTMLDivElement) => {
    if(!node) return;

    const view = new EditorView({
      // state,
      parent: node
    });

    //@ts-expect-error
    node.children[0]["view"] = view;
    setView(view);
  }, []);

  return openFile ? <div sx={{
    "& > *": {
      height: "100%",
      width: "100%"
    }
  }} className={className} ref={editorRef} /> : null;
}