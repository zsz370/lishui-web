import { memo, useEffect, useRef, useState } from 'react';
import GuideMedia from './GuideMedia.jsx';
import { guideSpeechActivity } from '../services/guideSpeechActivity.js';

const lines = [
  '你好，欢迎来到溧水！我是淮源姐，很高兴陪你走这一程。',
  '想先看山水，还是尝尝当地滋味？从你喜欢的地方开始，咱们慢慢逛。',
  '游玩之外，住宿、天气和交通也可以问我。把喜欢的地方加入行程，咱们一起安排。',
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

// Isolate the looping guide media from the rest of the homepage.
export default memo(function WelcomeGuide({ host }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [welcoming, setWelcoming] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const speechRun = useRef(0);
  const speechOwner = useRef(Symbol('welcome-speech'));
  const ownsSpeech = useRef(false);
  const speechTimeout = useRef(null);

  const cancelSpeech = () => {
    guideSpeechActivity.set(speechOwner.current, false);
    speechRun.current += 1;
    window.clearTimeout(speechTimeout.current);
    if (ownsSpeech.current && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    ownsSpeech.current = false;
    setSpeaking(false);
  };

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('lishui-welcome-seen') === '1';
      sessionStorage.setItem('lishui-welcome-seen', '1');
    } catch { /* Storage can be unavailable in private browsing. */ }
    if (!seen && !reduced) {
      setWelcoming(true);
      setRun((value) => value + 1);
    }
    return () => {
      guideSpeechActivity.set(speechOwner.current, false);
      speechRun.current += 1;
      window.clearTimeout(speechTimeout.current);
      if (ownsSpeech.current && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!welcoming || speaking) return undefined;
    const timers = [
      window.setTimeout(() => setStep(1), 4500),
      window.setTimeout(() => setStep(2), 9000),
      window.setTimeout(() => setWelcoming(false), 14000),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [run, welcoming, speaking]);

  const replay = () => {
    cancelSpeech();
    setNotice('');
    setStep(0);
    setWelcoming(true);
    setRun((value) => value + 1);
  };

  const listen = () => {
    if (speaking) {
      cancelSpeech();
      setWelcoming(false);
      return;
    }
    cancelSpeech();
    setNotice('');
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      replay();
      setNotice('当前浏览器不支持语音，欢迎介绍仍可通过字幕阅读。');
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find((voice) => voice.localService === true && /^zh[-_]/i.test(voice.lang));
    if (voices.length > 0 && !chineseVoice) {
      replay();
      setNotice('当前设备没有本地中文语音，请阅读欢迎字幕。');
      return;
    }
    const token = speechRun.current;
    ownsSpeech.current = true;
    setStep(0);
    setWelcoming(true);
    const failed = () => {
      if (speechRun.current !== token) return;
      cancelSpeech();
      setWelcoming(false);
      setNotice('语音暂时无法播放，请阅读欢迎字幕或稍后重试。');
    };
    speechTimeout.current = window.setTimeout(failed, 60000);
    lines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.95;
      if (chineseVoice) utterance.voice = chineseVoice;
      utterance.onstart = () => {
        if (speechRun.current === token) { setStep(index); setSpeaking(true); guideSpeechActivity.set(speechOwner.current, true); }
      };
      utterance.onerror = failed;
      utterance.onend = () => {
        if (index !== lines.length - 1 || speechRun.current !== token) return;
        window.clearTimeout(speechTimeout.current);
        ownsSpeech.current = false;
        guideSpeechActivity.set(speechOwner.current, false);
        setSpeaking(false);
        setWelcoming(false);
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  return (
    <aside className="welcome-guide" aria-label="淮源姐欢迎导览">
      <div className="welcome-bubble">
        <div className="welcome-bubble-heading">
          <span className={`welcome-status-dot ${welcoming ? 'is-active' : ''}`} />
          <span>{host.name}<span className="welcome-role"> · 你的溧水导游</span></span>
          <span className="welcome-step">{String(step + 1).padStart(2, '0')} / 03</span>
        </div>
        <p aria-live="polite" aria-atomic="true">{lines[step]}</p>
      </div>
      <div className="welcome-stage">
        <GuideMedia persona={host} state={speaking ? 'speaking' : 'idle'} />
      </div>
      <div className="welcome-controls">
        <button className="welcome-listen" type="button" onClick={listen} aria-label={speaking ? '停止介绍（淮源姐）' : '听欢迎介绍（淮源姐）'} aria-pressed={speaking}>
          <span aria-hidden="true">{speaking ? 'Ⅱ' : '▷'}</span>{speaking ? '停止介绍' : '听欢迎介绍'}
        </button>
        <button type="button" onClick={replay}>重播字幕</button>
      </div>
      <div className="welcome-footnote" role="status">{notice || '数字人形象为 AI 生成 · 点击后播放语音'}</div>
    </aside>
  );
});
