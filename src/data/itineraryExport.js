export const EXPORT_WIDTH = 750;
export const EXPORT_HEIGHT = 1500;
export const EXPORT_BODY_SIZE = 32;
export const EXPORT_LINE_HEIGHT = 48;
export const EXPORT_MARGIN = 48;
export const EXPORT_FIRST_LINE = 210;
export const EXPORT_ROWS = 24;

// 保留原文本的每个字符；长链接按实际字宽换行，不截断或以省略号代替出处。
export function wrapExportText(text, measure, width) {
  const rows = [];
  const segment = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
  for (const [paragraph, line] of text.split('\n').entries()) {
    const characters = segment ? Array.from(segment.segment(line), (item) => item.segment) : Array.from(line);
    let row = '';
    for (const char of characters) {
      if (row && measure(row + char) > width) { rows.push({ text: row, paragraph }); row = ''; }
      row += char;
    }
    rows.push({ text: row, paragraph });
  }
  return rows;
}
export function paginateExport(rows, count = EXPORT_ROWS) {
  if (!Number.isInteger(count) || count < 1) throw new Error('每页行数须大于0');
  const pages = [];
  for (let offset = 0; offset < rows.length; offset += count) pages.push(rows.slice(offset, offset + count));
  return pages;
}
export function restoreExportText(rows) {
  const paragraphs = [];
  for (const row of rows) paragraphs[row.paragraph] = (paragraphs[row.paragraph] || '') + row.text;
  return paragraphs.join('\n');
}
