import { createEditorState } from '../lib/codemirror/init'
import { useEffect, useRef } from 'preact/hooks'
import { EditorView } from '@codemirror/view'
import styles from '../styles/codemirror.module.css'
import { global_state } from "../lib/global_state";


export default function CodeMirror() {
	const parent = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!parent.current) throw new Error('Oh golly! The editor parent ref is null')
		const view = new EditorView({
			state: createEditorState(),
			parent: parent.current
		})
		global_state.codemirror = view;
	}, [])

	return (
		<div class={styles.test} ref={parent} />
	)
}