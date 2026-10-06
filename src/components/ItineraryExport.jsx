import { useEffect, useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { EXPORT_WIDTH, EXPORT_HEIGHT, EXPORT_BODY_SIZE, EXPORT_LINE_HEIGHT, EXPORT_MARGIN, EXPORT_FIRST_LINE, wrapExportText, paginateExport } from '../data/itineraryExport.js';
import './ItineraryExport.css';
import { planStorageNote } from '../data/itinerary.js';

const font = `${EXPORT_BODY_SIZE}px "Microsoft YaHei", sans-serif`;
const noPages = [];
export default function ItineraryExport({ text, fullText = text, detailed = false, savedLocally }) {
  const [prepared, setPrepared] = useState({}), [page, setPage] = useState(0), [rendered, setRendered] = useState({}), [error, setError] = useState('');
  const pages = prepared.text === text ? prepared.pages : noPages;
  const image = rendered.page === page && rendered.text === text ? rendered.src : '';
  useEffect(() => {
    let cancelled = false;
    setRendered({}); setPrepared({}); setPage(0); setError('');
    const prepare = async () => {
      try {
        let timer;
        try { await Promise.race([document.fonts.ready, new Promise((resolve) => { timer = window.setTimeout(resolve, 2000); })]); } finally { window.clearTimeout(timer); }
        if (cancelled) return;
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
        ctx.font = font;
        setPrepared({ text, pages: paginateExport(wrapExportText(text, (line) => ctx.measureText(line).width, EXPORT_WIDTH - EXPORT_MARGIN * 2)) });
      } catch { if (!cancelled) setError('此浏览器暂不能生成图片，请复制下面的完整行程文字。'); }
    };
    prepare(); return () => { cancelled = true; };
  }, [text]);
  useEffect(() => {
    if (!pages[page]) return;
    try {
      const canvas = document.createElement('canvas'); canvas.width = EXPORT_WIDTH; canvas.height = EXPORT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
      ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#344d36'; ctx.font = '34px "Microsoft YaHei", sans-serif'; ctx.fillText('我的溧水旅程', EXPORT_MARGIN, 75);
      ctx.font = '22px "Microsoft YaHei", sans-serif'; ctx.fillText('随身行程 · 规划草稿', EXPORT_MARGIN, 118);
      ctx.strokeStyle = '#637d53'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(EXPORT_MARGIN, 158); ctx.bezierCurveTo(160, 158, 155, 133, 245, 145); ctx.bezierCurveTo(330, 155, 350, 179, 440, 156); ctx.stroke();
      for (const [x, y] of [[110, 151], [258, 147], [417, 161]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = font; ctx.textBaseline = 'top';
      for (const [index, row] of pages[page].entries()) {
        ctx.fillStyle = /^(冲突|待确认)/.test(row.text) ? '#7c452d' : '#344d36';
        ctx.fillText(row.text, EXPORT_MARGIN, EXPORT_FIRST_LINE + index * EXPORT_LINE_HEIGHT);
      }
      ctx.strokeStyle = '#d4decd'; ctx.beginPath(); ctx.moveTo(EXPORT_MARGIN, 1390); ctx.lineTo(EXPORT_WIDTH - EXPORT_MARGIN, 1390); ctx.stroke();
      ctx.fillStyle = '#52654a'; ctx.font = '20px "Microsoft YaHei", sans-serif'; ctx.fillText('费用与安排为个人规划，出发前核准。', EXPORT_MARGIN, 1410);
      ctx.fillText(`遇见美溧 · ${page + 1} / ${pages.length}`, EXPORT_MARGIN, 1450);
      setRendered({ page, text, src: canvas.toDataURL('image/png') });
    } catch { setError('此浏览器暂不能生成图片，请复制下面的完整行程文字。'); setRendered({}); }
  }, [pages, page, text]);
  return <section className="itinerary-export" aria-labelledby="itinerary-export-title">
    <div className="plan-section-heading"><div><p className="section-overline">把这一程带走</p><h2 id="itinerary-export-title" tabIndex="-1">随身行程卡</h2></div></div>
    <p>{detailed ? '详细版保留来源、导航和全部待确认项；内容较长时分页保存。' : '精简版只展示已填安排，省略空字段。关键冲突仍保留；完整核对清单与出处可在下方展开。'}</p><p className="export-local-note">图片包含你填写的出行备注；请确认后再分享。{planStorageNote(savedLocally)}</p>
    <div className="export-controls"><label htmlFor="itinerary-export-page">选择图片<select id="itinerary-export-page" value={page} disabled={!pages.length} onChange={(event) => setPage(Number(event.target.value))}>{pages.map((items, index) => <option key={index} value={index}>第{index + 1}张 / 共{pages.length}张</option>)}</select></label>{image && <a className="experience-button" href={image} download={`遇见美溧-随身行程-${page + 1}of${pages.length}.png`}><DownloadSimple size={16} aria-hidden="true" />下载第{page + 1}张图片</a>}</div>
    {error ? <p className="export-error" role="status">{error}</p> : image ? <figure><img src={image} width={EXPORT_WIDTH} height={EXPORT_HEIGHT} alt={`随身行程卡第${page + 1}张，共${pages.length}张。完整文字在下方。`} /><figcaption>750 × 1500像素 · 可下载后放大查看</figcaption></figure> : <p role="status">正在生成行程图片…</p>}
    <details className="export-full-text"><summary>完整行程文字与可点击导航</summary><div>{fullText.split('\n').map((line, index) => {
      const match = line.match(/^(导航|返程导航)：(https:\/\/uri\.amap\.com\/navigation\?.+)$/);
      return <p key={index}>{match ? <a href={match[2]} target="_blank" rel="noreferrer">{match[1]}：打开高德路线</a> : line}</p>;
    })}</div><label htmlFor="export-copy-text">复制受限时，全选下面的文字</label><textarea id="export-copy-text" readOnly value={fullText} rows={7} onFocus={(event) => event.target.select()} /></details>
  </section>;
}
