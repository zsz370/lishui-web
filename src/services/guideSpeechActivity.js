// 只跟随实际语音事件；多个播报组件结束时不会误停另一段正在播放的语音。
export function createGuideSpeechActivity() {
  const owners = new Set(), listeners = new Set();
  const getSnapshot = () => owners.size > 0;
  return {
    getSnapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    set(owner, speaking) {
      const before = getSnapshot();
      if (speaking) owners.add(owner); else owners.delete(owner);
      if (before !== getSnapshot()) listeners.forEach(listener => listener());
    },
  };
}

export const guideSpeechActivity = createGuideSpeechActivity();
