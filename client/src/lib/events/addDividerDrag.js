import { pauseEvent } from "./listen";

export function addDividerDrag(state, listener) {
  let moveVerticalBar = false;
  let rect = null;

  listener("mousedown", ".divider", e => {
    moveVerticalBar = true;
    rect = e.target.parentNode.getBoundingClientRect();
  })

  listener("mousemove", "", (e) => {
    if (!moveVerticalBar) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const parentWidth = Math.abs(rect.left - rect.right);

    let xPerc = x/parentWidth * 100;

    const minX = 1;
    const maxX = 100;

    if (xPerc < minX) xPerc = minX;
    if (xPerc > maxX) xPerc = maxX;

    document.documentElement.style.setProperty("--cm-width", `${xPerc}%`);

    pauseEvent(e);
  })

  listener("mouseup", "", e => {
    moveVerticalBar = false;
  })

  listener("mouseleave", "body", e => {
    moveVerticalBar = false;
  })
}