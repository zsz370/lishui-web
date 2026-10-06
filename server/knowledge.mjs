import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AppError } from './core.mjs';

const corpusPath = new URL('../docs/corpus-audit/approved-corpus.json',import.meta.url);
const indexPath = new URL('../runtime.local/knowledge-index.json',import.meta.url);
export const corpusHash = (chunks) => createHash('sha256').update(JSON.stringify(chunks)).digest('hex');
export const vectorText = (chunk) => `${chunk.question}\n${chunk.answer}`;
export function cosine(a,b) {
  if (a.length !== b.length || !a.length) return 0;
  let dot=0,aa=0,bb=0; for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2;}
  return aa && bb ? dot/Math.sqrt(aa*bb) : 0;
}
export async function readCorpus() {
  const raw = JSON.parse(await readFile(corpusPath,'utf8'));
  if (!raw.chunks?.every((chunk) => chunk.status === 'approved' && chunk.sources.length > 0)) throw new Error('Only approved, sourced chunks can be indexed');
  return raw.chunks;
}
export async function buildIndex(providers, model, {force=false} = {}) {
  const chunks = await readCorpus(), hash=corpusHash(chunks);
  if (!force) { try { const prior=JSON.parse(await readFile(indexPath,'utf8')); if(prior.hash===hash && prior.model===model && prior.vectors?.length===chunks.length) return prior; } catch { /* rebuild */ } }
  const vectors = await providers.embed(chunks.map(vectorText));
  if(vectors.length!==chunks.length || vectors.some((vector) => vector.length!==vectors[0].length)) throw new Error('Vector dimensions mismatch');
  const index={version:1,model,hash,builtAt:new Date().toISOString(),dimensions:vectors[0].length,ids:chunks.map((chunk)=>chunk.id),vectors};
  await mkdir(new URL('../runtime.local/',import.meta.url),{recursive:true});
  await writeFile(new URL('../runtime.local/knowledge-index.tmp',import.meta.url),JSON.stringify(index),'utf8');
  await rename(new URL('../runtime.local/knowledge-index.tmp',import.meta.url),indexPath);
  return index;
}
export async function createKnowledge(providers, model) {
  const chunks=await readCorpus(); let index=null;
  try {
    const candidate=JSON.parse(await readFile(indexPath,'utf8'));
    if(candidate.hash===corpusHash(chunks) && candidate.model===model && candidate.ids?.every((id,i)=>id===chunks[i]?.id) && candidate.ids.length===chunks.length && candidate.vectors?.length===chunks.length && candidate.vectors.every((v)=>v.length===candidate.dimensions && v.every(Number.isFinite))) index=candidate;
  } catch { /* /ready reports missing/stale index */ }
  const cache=new Map();
  return { chunks, status:()=>({ready:!!index,chunks:chunks.length,dimensions:index?.dimensions,model,hash:corpusHash(chunks),builtAt:index?.builtAt}),
    async retrieve(question,{nodeId,expertId,serviceId,limit=5,signal,onMetric}={}) {
      signal?.throwIfAborted();
      if(!index) throw new AppError('INDEX_NOT_READY','资料索引尚未建立或已经过期，请重建索引',503);
      let vector=cache.get(question);
      if(!vector){const activeProviders=providers.withRuntime?.({signal,onMetric})||providers;[vector]=await activeProviders.embed([question],{signal});signal?.throwIfAborted();if(cache.size>=100) cache.delete(cache.keys().next().value); cache.set(question,vector); }
      if(vector.length!==index.dimensions) throw new AppError('INDEX_NOT_READY','检索模型维度与索引不一致',503);
      return chunks.map((chunk,i)=>({...chunk,score:cosine(vector,index.vectors[i])})).filter((chunk)=>(!nodeId||chunk.nodeId===nodeId)&&(!expertId||chunk.expertId===expertId)&&(!serviceId||chunk.serviceId===serviceId)&&chunk.score>=0.48).sort((a,b)=>b.score-a.score).slice(0,limit);
    },
  };
}
