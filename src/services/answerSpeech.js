import { guideSpeechActivity } from './guideSpeechActivity.js';
// The browser supplies a local Chinese voice. Answer text never goes to a TTS endpoint.
export function splitSpeechText(text, limit = 180) {
  const chunks = [];
  let current = '';
  for (const character of String(text)) {
    current += character;
    if (/[。！？；\n]/u.test(character) || Array.from(current).length >= limit) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function createAnswerSpeech({
  synthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  onState = () => {},
  schedule = setTimeout,
  unschedule = clearTimeout,
  activity = guideSpeechActivity,
} = {}) {
  const speechOwner = Symbol('answer-speech');
  let generation = 0, timer, removeVoiceListener, ownsSpeech = false, disposed = false;
  let state = { status: 'idle', messageId: null, fragment: '', voiceName: '', error: '' };
  const publish = (changes) => {
    state = { ...state, ...changes };
    if (changes.status === 'playing') activity.set(speechOwner, true);
    else if (changes.status && changes.status !== 'starting') activity.set(speechOwner, false);
    if (!disposed) onState(state);
  };
  const clearWaiting = () => {
    if (timer !== undefined) unschedule(timer);
    timer = undefined;
    removeVoiceListener?.();
    removeVoiceListener = undefined;
  };
  const cancel = (notify = true) => {
    generation++;
    activity.set(speechOwner, false);
    clearWaiting();
    if (ownsSpeech) { ownsSpeech = false; synthesis.cancel(); }
    if (notify && ['starting', 'playing'].includes(state.status)) publish({ status: 'stopped', fragment: '' });
  };
  const fail = (run, message) => {
    if (run !== generation || disposed) return;
    cancel(false);
    publish({ status: 'error', error: message, fragment: '' });
  };
  const play = (messageId, text) => {
    if (disposed) return;
    cancel(false);
    const run = generation;
    publish({ status: 'starting', messageId, fragment: '', voiceName: '', error: '' });
    if (!synthesis || !Utterance) return fail(run, '当前浏览器不支持朗读，请继续阅读文字。');
    const chunks = splitSpeechText(text);
    if (!chunks.length) return fail(run, '这条答复没有可朗读的文字。');
    const begin = () => {
      if (run !== generation || disposed) return;
      let voices;
      try { voices = synthesis.getVoices(); } catch { return fail(run, '无法读取设备声音，请继续阅读文字。'); }
      const candidates = voices.filter((voice) => voice.localService === true && /^zh[-_]/i.test(voice.lang));
      const voice = candidates.find((item) => /^zh[-_]CN$/i.test(item.lang)) || candidates[0];
      if (!voice) return voices.length > 0 ? fail(run, '未找到设备本地中文声音。可安装中文语音后重试，文字仍可阅读。') : false;
      clearWaiting();
      publish({ voiceName: voice.name });
      const speakChunk = (index) => {
        if (run !== generation || disposed) return;
        publish({ status: 'starting', fragment: '' });
        const utterance = new Utterance(chunks[index]);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 1;
        utterance.onstart = () => {
          if (run !== generation || disposed) return;
          clearWaiting();
          publish({ status: 'playing', fragment: chunks[index] });
          timer = schedule(() => fail(run, '设备朗读未正常结束，可重播或继续阅读文字。'), 120000);
        };
        utterance.onend = () => {
          if (run !== generation || disposed) return;
          clearWaiting();
          if (index + 1 < chunks.length) speakChunk(index + 1);
          else { ownsSpeech = false; publish({ status: 'completed', fragment: '' }); }
        };
        utterance.onerror = () => fail(run, '设备朗读中断，可重播或继续阅读文字。');
        timer = schedule(() => fail(run, '设备声音未启动，可重试或继续阅读文字。'), 8000);
        ownsSpeech = true;
        try { synthesis.speak(utterance); } catch { fail(run, '设备声音无法播放，请继续阅读文字。'); }
      };
      speakChunk(0);
      return true;
    };
    if (begin() !== false || run !== generation) return;
    // Some browsers load voice inventories asynchronously after the first request.
    const listener = () => begin();
    synthesis.addEventListener?.('voiceschanged', listener);
    removeVoiceListener = () => synthesis.removeEventListener?.('voiceschanged', listener);
    timer = schedule(() => fail(run, '设备中文声音未就绪，请稍后重试；文字仍可阅读。'), 2000);
  };
  return { play, stop: () => cancel(), dispose: () => { disposed = true; cancel(false); } };
}
