// Derived repair only: preserve original spreadsheets and their extraction.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { queryServiceQA } from '../src/data/foundationQA.js';
const dir = new URL('../docs/corpus-audit/', import.meta.url);
const rows = JSON.parse(await readFile(new URL('qa-rows.json', dir), 'utf8'));
const pairs = [
  { file: '淮源姐', start: 5, end: 6, q: '只有一天时间，推荐哪条线？' },
  { file: '天生桥', start: 5, end: 6, q: '字体能调大吗？' },
  { file: '软语囡', start: 4, end: 5, q: '来首溧水童谣？' },
];
const consumed = new Set();
const items = [];
for (const pair of pairs) {
  const sourceRows = rows.filter((row) => row.path.endsWith(`QA导入_${pair.file}.xlsx`) && row.sheet === 'QA' && [pair.start, pair.end].includes(row.row)).sort((a,b) => a.row-b.row);
  assert.equal(sourceRows.length, 2);
  assert.equal(sourceRows[0].cells[0], pair.q);
  assert(sourceRows.every((row) => !row.cells[1]));
  sourceRows.forEach((row) => consumed.add(row));
  const approved = queryServiceQA(pair.q);
  items.push({ question: pair.q, answer: approved?.a || '尚未取得溧水本地采录出处，暂不能把原稿中的通行儿歌认作溧水专属童谣。请补充采录地域、采录者、时间与文献页码后再核验。', status: approved ? 'approved' : 'pending', repair: 'merge_split_rows_and_revise', reviewedQuestionId: approved?.id, sources: approved?.sources || [], sourceRows, reason: approved ? '删除未核开放、露营或原网页不存在的功能承诺' : '结构修复不等于地域来源审核通过；不调用原稿歌词' });
}
for (const row of rows) {
  if (consumed.has(row)) continue;
  assert(String(row.cells[0] || '').trim() && String(row.cells[1] || '').trim());
  items.push({ question: row.cells[0], answer: row.cells[1], status: 'unreviewed', sourceRows: [row] });
}
assert.equal(consumed.size, 6);
assert.equal(items.length, 184);
assert.equal(items.reduce((sum, item) => sum + item.sourceRows.length, 0), rows.length);
await writeFile(new URL('normalized-qa.json', dir), JSON.stringify({ version: '2026-10-04', scope: '原始QA的派生修复副本，不自动入RAG；原始文件未改动', rawRows: rows.length, repairedRawRows: consumed.size, mergedPairs: pairs.length, count: items.length, approvedRepairs: 2, pendingRepairs: 1, items }, null, 2) + '\n');
console.log(JSON.stringify({ rawRows: rows.length, repairedRawRows: consumed.size, normalizedQuestions: items.length, approvedRepairs: 2, pendingRepairs: 1 }));
