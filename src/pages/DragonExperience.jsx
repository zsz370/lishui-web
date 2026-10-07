import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle, ArrowClockwise, DownloadSimple } from '@phosphor-icons/react';
import { getNode } from '../data/nodes.js';
import { getPersona } from '../data/personas.js';
import { useItinerary } from '../data/store.jsx';
import { DRAGON_RESULT_KEY, dragonQuestions, createDragonResult, readDragonResult, saveDragonResult } from '../data/dragonExperience.js';
import GuideAvatar from '../components/GuideAvatar.jsx';
import JourneyThread, { JourneyMark } from '../components/JourneyThread.jsx';
import PageGuide from '../components/PageGuide.jsx';
import './DragonExperience.css';

export default function DragonExperience() {
  const [started, setStarted] = useState(false), [index, setIndex] = useState(0), [choice, setChoice] = useState(null), [answers, setAnswers] = useState([]), [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null), [previous, setPrevious] = useState(() => { try { return readDragonResult(localStorage); } catch { return null; } });
  const [notice, setNotice] = useState(''), [saved, setSaved] = useState(true), [showExpert, setShowExpert] = useState(false);
  const startedAt = useRef(0), questionHeading = useRef(null), resultHeading = useRef(null), feedbackHeading = useRef(null);
  const { add, has } = useItinerary();
  const question = dragonQuestions[index], node = getNode('c_ldl'), guide = getPersona(node.expert);
  useEffect(() => { if (result) resultHeading.current?.focus(); else if (confirmed) feedbackHeading.current?.focus(); else if (started) questionHeading.current?.focus(); }, [started, index, result, confirmed]);
  const start = () => { startedAt.current = Date.now(); setStarted(true); setIndex(0); setChoice(null); setAnswers([]); setConfirmed(false); setResult(null); setShowExpert(false); setNotice(''); };
  const confirm = () => { if (choice === null || confirmed) return; setAnswers((items) => [...items, choice]); setConfirmed(true); };
  const next = () => {
    if (index < dragonQuestions.length - 1) { setIndex((current) => current + 1); setChoice(null); setConfirmed(false); }
    else { const record = createDragonResult(answers, startedAt.current); setResult(record); let success = false; try { success = saveDragonResult(localStorage, record); } catch { /* 存储禁用时保留页面结果 */ } setSaved(success); if (success) setPrevious(record); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = '骆山大龙-文化体验记录.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const clear = () => { try { localStorage.removeItem(DRAGON_RESULT_KEY); setPrevious(null); setNotice('已清除本地体验记录，当前页面的答题结果仍可查看。'); } catch { setNotice('浏览器暂不能清除记录，请在浏览器设置中管理本站数据。'); } };
  return <div className="dragon-experience">
    <Link className="detail-back" to="/nodes/c_ldl">回到骆山大龙名片 <ArrowUpRight size={15} aria-hidden="true" /></Link>
    <JourneyThread step="learn" />
    <header className="dragon-intro"><div><p className="section-overline">乡里故事 · 文化小任务</p><h1>一条大龙，<br />三点认识。</h1><p>从名录、龙身与传说，听懂骆山大龙。读一段材料，做一次选择，再听淮源姐解释。</p><p className="dragon-design-note">建议留出2—3分钟。这是文化辨识体验设计，不是完整传统工艺或仪式复原；资料规模不代表当年演出安排。</p></div><div className="dragon-symbol"><JourneyMark /><strong>遇见 · 理解 · 带走</strong><span>原创河线示意 · 非历史原物</span><div><GuideAvatar persona={guide} /><p>由{guide.name}陪你认识<br />骆山大龙</p></div></div></header>
    {!started ? <section className="dragon-start"><h2>从一点好奇开始</h2><p>三道题都可以回看依据。选错也会给出解释，完成后可保存这次结果，再把相关名片加入行程。</p><button type="button" className="experience-button" onClick={start}>开始认识大龙 <ArrowUpRight size={17} aria-hidden="true" /></button>{previous && <p>当前浏览器上次完成：{new Date(previous.completedAt).toLocaleString('zh-CN')} · {previous.score}/{previous.total}题。<button className="experience-text-button" type="button" onClick={clear}>清除本地体验记录</button></p>}</section> : result ? <section className="dragon-result">
      <p className="section-overline">听懂故事，也给这一天留下记忆</p><h2 ref={resultHeading} tabIndex="-1">已完成三点认识</h2><p className="dragon-score">本次首次选择答对 <strong>{result.score}</strong> / {result.total} 题 · 用时{result.elapsedSeconds}秒</p>
      <p>再向同行者讲述时，记住这三点：正式身份看名录，规模看资料范围，传说说明是故事。</p><ol>{dragonQuestions.map((item, i) => <li key={item.id}><CheckCircle size={18} aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.options[answers[i]]} · {answers[i] === item.correct ? '首次选择正确' : '已读解释，可继续认识'}</p><details><summary>回看知识与出处</summary><p>{item.explanation}</p>{item.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={13} aria-hidden="true" /></a>)}</details></div></li>)}</ol>
      <div className="dragon-actions"><button className="experience-button" type="button" disabled={has(node.id)} onClick={() => { add(node.id); setNotice('已加入骆山大龙名片；实际参访地址和演出日期仍需确认。'); }}>{has(node.id) ? '已加入我的行程' : '加入骆山大龙名片'}</button><Link to="/itinerary">安排这一天 <ArrowUpRight size={16} aria-hidden="true" /></Link><button className="experience-text-button" type="button" onClick={() => setShowExpert(true)}>向淮源姐追问</button></div>
      <div className="dragon-record"><p>{saved ? '仅保存当前浏览器最近一次的选项、得分与用时，可清除；不会自动上传。' : '浏览器无法保存，这次结果仍可下载；离开页面可能丢失。'} 这份记录不代表学习效果或真实游客研究。</p><button type="button" onClick={download}><DownloadSimple size={16} aria-hidden="true" />下载本次体验记录</button><button type="button" onClick={clear}>清除本地体验记录</button><button type="button" onClick={start}><ArrowClockwise size={16} aria-hidden="true" />再认识一次</button></div>
    </section> : <section className="dragon-question" aria-label={`第${index + 1}题`}>
      <div className="dragon-question-count"><span>认识 {String(index + 1).padStart(2, '0')} / 03</span><span>{question.title}</span></div><h2 ref={questionHeading} tabIndex="-1">{question.question}</h2><div className="dragon-observe"><h3>先观察材料</h3><p>{question.observation}</p><details><summary>阅读完整依据与出处</summary><p>{question.explanation}</p>{question.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={13} aria-hidden="true" /></a>)}</details></div>
      <fieldset disabled={confirmed}><legend>作出你的选择</legend>{question.options.map((option, optionIndex) => <label key={option} className={choice === optionIndex ? 'is-chosen' : ''}><input type="radio" name={question.id} value={optionIndex} checked={choice === optionIndex} onChange={() => setChoice(optionIndex)} /><span>{option}</span></label>)}</fieldset>
      {!confirmed ? <button type="button" className="experience-button" disabled={choice === null} onClick={confirm}>看看解释</button> : <div className="dragon-feedback" role="status"><h3 ref={feedbackHeading} tabIndex="-1">{choice === question.correct ? '这一点，你认清了。' : '换个角度，再认识一点。'}</h3><p>{question.explanation}</p>{question.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">依据：{source.label} <ArrowUpRight size={13} aria-hidden="true" /></a>)}<button type="button" className="experience-button" onClick={next}>{index === dragonQuestions.length - 1 ? '留下这次认识' : '认识下一点'} <ArrowUpRight size={16} aria-hidden="true" /></button></div>}
    </section>}
    {showExpert && <section className="dragon-expert" aria-label="向淮源姐追问"><h2>关于大龙，还有什么好奇？</h2><PageGuide node={node} title="把你的好奇带给淮源姐" /></section>}
    <p className="dragon-notice" role="status">{notice}</p>
  </div>;
}
