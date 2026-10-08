import { readFile, writeFile, rename } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { corpusHash, vectorText, readCorpus } from '../server/knowledge.mjs';

// 只有删除、未改变剩余向量文本时才允许复用；新增或修改内容必须正常重建索引。
const priorRoot = new URL('../.web_review/batch3-before/',import.meta.url);
const oldCorpus = JSON.parse(await readFile(new URL('docs/corpus-audit/approved-corpus.json',priorRoot),'utf8')).chunks;
const prior = JSON.parse(await readFile(new URL('runtime.local/knowledge-index.json',priorRoot),'utf8'));
assert.equal(prior.hash,corpusHash(oldCorpus));
assert.equal(prior.vectors.length,oldCorpus.length);
const oldById = new Map(oldCorpus.map((chunk,index)=>[chunk.id,{chunk,index}]));
const chunks = await readCorpus();
assert(chunks.length>0 && chunks.length<=oldCorpus.length);
const vectors = chunks.map(chunk=>{
  const old=oldById.get(chunk.id);assert(old,'出现新增语料，不能复用旧向量');
  assert.equal(vectorText(chunk),vectorText(old.chunk),'剩余文本已修改，不能复用旧向量');
  assert.equal(chunk.expertId,old.chunk.expertId);
  const vector=prior.vectors[old.index];assert(vector.length===prior.dimensions&&vector.every(Number.isFinite));return vector;
});
const index={...prior,hash:corpusHash(chunks),ids:chunks.map(chunk=>chunk.id),vectors,builtAt:new Date().toISOString()};
const temporary=new URL('../runtime.local/knowledge-index.tmp',import.meta.url);
await writeFile(temporary,JSON.stringify(index),'utf8');
await rename(temporary,new URL('../runtime.local/knowledge-index.json',import.meta.url));
console.log(JSON.stringify({chunks:chunks.length,reusedVectors:vectors.length,dimensions:index.dimensions,hash:index.hash,noExternalEmbeddingRequest:true}));
