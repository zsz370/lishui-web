import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root=process.cwd();
const envText=await readFile(join(root,'config/integrations.env.local'),'utf8');
const secrets=envText.split(/\r?\n/).filter((line)=>/^[A-Z0-9_]*(?:API_KEY|SECRET|WEB_SERVICE_KEY)=/.test(line)).map((line)=>({name:line.split('=')[0],value:line.slice(line.indexOf('=')+1).trim()})).filter((entry)=>entry.value.length>=12);
const files=[];
async function collect(directory) {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const path=join(directory,entry.name);
    if(entry.isDirectory()) {if(!entry.name.endsWith('.local')&&entry.name!=='node_modules')await collect(path);}
    else if(/\.(?:js|jsx|mjs|cjs|ts|tsx|json|html|md|css|txt|example)$/.test(entry.name)) files.push(path);
  }
}
for(const directory of ['src','public','dist','config','docs','server','scripts']) await collect(join(root,directory));
files.push(join(root,'README.md'));
const hits=[];
for(const file of files){const text=await readFile(file,'utf8');for(const secret of secrets)if(text.includes(secret.value))hits.push({file:relative(root,file),credential:secret.name});}
const report={checkedAt:new Date().toISOString(),scope:'前端、公开目录、构建、配置样例、报告、服务端代码与脚本；私有配置和忽略的运行缓存不作为公开文件',scannedFiles:files.length,credentialValuesChecked:secrets.length,hits,status:hits.length?'failed':'passed'};
await writeFile(join(root,'docs/agent-audit/security-check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(hits.length)process.exitCode=1;
