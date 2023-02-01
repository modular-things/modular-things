import styles from '../styles/TopMenu.module.css'


export default function TopMenu() {
  return (
    <div class={[styles["top-menu"], "prevent-select"].join(" ")}>
      <div class={styles["menu-title"]}>Modular Things</div>
      <div class={[styles["menu-item"], "run-button"].join(" ")}>run (shift+enter)</div>
      <div class={[styles["menu-item"], "examples-dropdown"].join(" ")}>examples</div>
      <div class={[styles["menu-item"], "download-button"].join(" ")}>download</div>
    </div>
  )
}