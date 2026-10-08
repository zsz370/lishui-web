// 可视区域可能被软键盘缩小，不能只依赖布局视口高度。
export function keyboardViewport({ layoutHeight, height, offsetTop = 0, focused = false, mobile = false, scale = 1 }) {
  const inset = Math.max(0, Math.round(layoutHeight-height-offsetTop));
  return { active:Boolean(focused && mobile && Math.abs(scale-1)<.05 && inset>100), inset, height:Math.round(height), top:Math.round(offsetTop) };
}
export const nearMessageEnd = element => element.scrollHeight-element.scrollTop-element.clientHeight < 80;
