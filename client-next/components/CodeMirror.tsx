import { EditorView, basicSetup } from "codemirror"
import { keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript"
import { EditorState, StateField } from "@codemirror/state";
import { syntaxTree, indentUnit } from "@codemirror/language";
import { indentWithTab } from "@codemirror/commands";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeUIStyleObject } from "theme-ui";

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

export default function CodeMirror({ className }: { className?: string }) {
  // const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView>();

  const editorRef = useCallback((node: HTMLDivElement) => {
    if(!node) return;

    const extensions = [
      autocompleteRemoved, 
      javascript(),
      keymap.of([indentWithTab]), // TODO: We should put a note about Esc+Tab for accessibility somewhere.
      indentUnit.of("  "),
      // countDocChanges
    ]

    const state = EditorState.create({ extensions });

    const view = new EditorView({
      state,
      parent: node
    });
    //@ts-expect-error
    node.children[0]["view"] = view;
    setView(view);
  }, [])

  return <div sx={{
    "& > *": {
      height: "100%",
      width: "100%"
    }
  }} className={className} ref={editorRef} />;
}