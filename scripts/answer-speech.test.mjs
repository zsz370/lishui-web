import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerSpeech, splitSpeechText } from '../src/services/answerSpeech.js';

const local = { name: '本机中文试验声音', lang: 'zh-CN', localService: true };
function fixture(voices = [local]) {
  const states = [], spoken = [], listeners = new Set(), timers = new Map();
  let nextTimer = 0, cancelled = 0;
  const synthesis = {
    getVoices: () => voices,
    speak: (utterance) => spoken.push(utterance),
    cancel: () => cancelled++,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  };
  const controller = createAnswerSpeech({ synthesis, Utterance: class { constructor(text) { this.text = text; } }, onState: (state) => states.push(state),
    schedule: (callback, ms) => { const id = ++nextTimer; timers.set(id, { callback, ms }); return id; }, unschedule: (id) => timers.delete(id) });
  return { controller, states, spoken, listeners, timers, synthesis, get cancelled() { return cancelled; },
    voices: (updated) => { voices = updated; [...listeners].forEach((listener) => listener()); },
    expire: (ms) => { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.callback(); } },
  };
}
test('分段保留全答复及传说限定语，Unicode字符不被拆开', () => {
  const text = '无想寺的名字有传说。尚无确证，不作为史实。\n' + '🌿'.repeat(400);
  const chunks = splitSpeechText(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every((chunk) => Array.from(chunk).length <= 180));
});
test('点击只准备声音，真实start/end驱动字幕和结束；后续段未开始不显示播放', () => {
  const f = fixture(); f.controller.play(1, '第一段。第二段。');
  assert.equal(f.states.at(-1).status, 'starting');
  f.spoken[0].onstart(); assert.equal(f.states.at(-1).fragment, '第一段。');
  f.spoken[0].onend(); assert.equal(f.states.at(-1).status, 'starting');
  f.spoken[1].onstart(); f.spoken[1].onend();
  assert.equal(f.states.at(-1).status, 'completed'); assert.equal(f.timers.size, 0);
  assert.equal(f.spoken.map((item) => item.text).join(''), '第一段。第二段。');
});
test('停止后迟到的start/end/error不恢复播放或覆盖新答复', () => {
  const f = fixture(); f.controller.play(1, '旧答复。'); const old = f.spoken[0]; old.onstart();
  f.controller.stop(); assert.equal(f.states.at(-1).status, 'stopped');
  f.controller.play(2, '新答复。'); old.onstart(); old.onend(); old.onerror();
  assert.equal(f.states.at(-1).messageId, 2); assert.equal(f.states.at(-1).status, 'starting');
  assert.equal(f.cancelled, 1);
});
test('重播从答复第一字开始，不叠加旧语音', () => {
  const f = fixture(); f.controller.play(1, '头句。尾句。'); f.spoken[0].onstart(); f.spoken[0].onend();
  f.controller.play(1, '头句。尾句。'); assert.equal(f.spoken.at(-1).text, '头句。'); assert.equal(f.cancelled, 1);
});
test('仅使用本地中文声音，不默认采用远程中文或本机英文', () => {
  const f = fixture([{ name: 'remote', lang: 'zh-CN', localService: false }, { name: 'English', lang: 'en-US', localService: true }]);
  f.controller.play(1, '全文保留。'); assert.equal(f.spoken.length, 0); assert.equal(f.states.at(-1).status, 'error');
  assert.match(f.states.at(-1).error, /本地中文/);
});
test('异步voice清单加载后播放；停止或卸载会移除监听与定时器', () => {
  const f = fixture([]); f.controller.play(1, '答复。'); assert.equal(f.listeners.size, 1);
  f.voices([local]); assert.equal(f.spoken.length, 1); assert.equal(f.listeners.size, 0);
  f.controller.dispose(); assert.equal(f.cancelled, 1); assert.equal(f.timers.size, 0);
  const statesCount = f.states.length; f.spoken[0].onerror(); assert.equal(f.states.length, statesCount);
});
test('没有voice清单或无法启动会给出可恢复错误，播放超时会停止声音', () => {
  const f = fixture([]); f.controller.play(1, '答复。'); f.expire(2000); assert.equal(f.states.at(-1).status, 'error');
  const g = fixture(); g.controller.play(1, '答复。'); g.expire(8000); assert.equal(g.states.at(-1).status, 'error'); assert.equal(g.cancelled, 1);
  const h = fixture(); h.controller.play(1, '答复。'); h.spoken[0].onstart(); h.expire(120000);
  assert.equal(h.states.at(-1).status, 'error'); assert.equal(h.cancelled, 1);
});
test('不支持API、调用异常或设备error均保留文字路径；空文字不入队', () => {
  const states = []; const noAPI = createAnswerSpeech({ onState: (state) => states.push(state) }); noAPI.play(1, '答复。');
  assert.equal(states.at(-1).status, 'error');
  const f = fixture(); f.synthesis.speak = () => { throw new Error('device'); }; f.controller.play(1, '答复。');
  assert.equal(f.states.at(-1).status, 'error');
  const g = fixture(); g.controller.play(1, '答复。'); g.spoken[0].onerror(); assert.equal(g.states.at(-1).status, 'error');
  const h = fixture(); h.controller.play(1, ''); assert.equal(h.spoken.length, 0); assert.equal(h.states.at(-1).status, 'error');
});
