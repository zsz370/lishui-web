import test from 'node:test';
import assert from 'node:assert/strict';
import { nodes } from '../src/data/nodes.js';
import { filterAtlas } from '../src/data/atlas.js';
import { matchesNode } from '../src/services/nodeSearch.js';
import { nodeReading } from '../src/services/nodeReading.js';
import { approvedQA } from '../src/data/presetQA.js';
import { visitorAnswer } from '../src/data/visitorAnswerCopy.js';

for(const [query,id]of [['骆 山 大 龙','c_ldl'],['骆山\n大龙','c_ldl'],["luo'shan'da'long",'c_ldl'],[' LUO SHAN DALONG ','c_ldl'],['无 想 山','n_wx'],['Ｓ９','n_sj'],['陆家大龙','c_ljd'],['明觉 铁画','c_tj'],['牛肉 洪蓝','f_nr']])test(`风物搜索匹配：${JSON.stringify(query)}`,()=>{
 assert(filterAtlas('全部',query).some(item=>item.id===id));assert(nodes.filter(item=>matchesNode(item,query)).some(item=>item.id===id));
});
test('风物目录的所有名称均可查找，分类条件及撤下条目仍生效',()=>{
 for(const node of nodes)assert.equal(filterAtlas('全部',node.name)[0].id,node.id);
 assert.equal(filterAtlas('全部','陆 家 大 龙')[0].id,'c_ljd');
 assert.equal(filterAtlas('山水','骆山大龙').length,0);assert.equal(filterAtlas('全部','打五件').length,0);assert.equal(filterAtlas('全部','不存在的地点').length,0);
});
test('29项简介有三段阅读内容，新增阅读仍取自真实已审正文并保留传说边界',()=>{
 for(const node of nodes){assert(node.introduction.length>=3,node.id);assert(node.introduction.join('').length>=180,node.id);assert.doesNotMatch(node.introduction.join(''),/具体游览路线、乘船及开放安排以景区当日公告为准/);
  for(const item of nodeReading(node.id)){const qa=approvedQA.find(qa=>qa.id===item.id);assert.equal(item.content,visitorAnswer(qa));assert(item.sources.length);if(item.kind==='legend')assert.match(item.content,/尚无.*确证/);}
 }
});
