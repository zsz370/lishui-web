import { getConfig } from '../server/core.mjs';
import { createProviders } from '../server/providers.mjs';
import { buildIndex } from '../server/knowledge.mjs';
const config=getConfig();
try { const index=await buildIndex(createProviders(config),config.embedding.model,{force:process.argv.includes('--force')}); console.log(JSON.stringify({status:'ready',model:index.model,chunks:index.ids.length,dimensions:index.dimensions,hash:index.hash,builtAt:index.builtAt},null,2)); }
catch { console.error('建立索引失败：请检查向量服务配置和已审语料'); process.exitCode=1; }
