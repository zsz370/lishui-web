const aliases = {
 n_tsq:'天生桥 胭脂河 tianshengqiao yanzhihe tsq',n_wx:'wuxiangshan wxs',n_fjb:'fujiabian fjb',n_sj:'shijiuhu sjh',
 n_djs:'dajinshan guofangyuan',n_zy:'zhouyuan',n_dls:'donglushan guanyinsi',n_gx:'guoxingzhuangyuan',n_dp:'dongpinghu',
 f_ydg:'honglan yudaigao',f_szc:'honglan shouzhuaji',f_nr:'honglan niurou',f_xc:'mingjue xiangcai',f_ypg:'jingqiao yunpiangao',f_wf:'wufan',f_hm:'baima heimei',
 c_ldl:'luoshan dalong 龙舞',c_tj:'mingjue tiehua',c_cs:'putangqiao cishanmiaohui 南京祠山庙会',c_xsm:'xisong madeng 竹马',c_hl:'helinfang shuanglong',c_ljd:'lujia dalong 龙舞',c_tdd:'tiaodangdang',c_syg:'shijiu yuge',c_lh:'lishui jianzhi',c_qh:'qinhuai yuantou denghui',
 s_tj:'tongjijie',s_hl:'hailecheng',s_wxsz:'wuxiang shuizhen',
};
export const normalizeSearch = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
export function nodeSearchRank(node,query){const keyword=normalizeSearch(query),name=normalizeSearch(node.name);if(!keyword)return 0;return name===keyword?4:name.startsWith(keyword)?3:name.includes(keyword)?2:normalizeSearch(aliases[node.id]).includes(keyword)?1:0;}
export function matchesNode(node, query) {
 const keyword=normalizeSearch(query);if(!keyword)return true;
 const text=normalizeSearch([node.name,node.summary,node.cat,...node.introduction||[],...node.facts||[],aliases[node.id]].join(' '));
 if(text.includes(keyword))return true;
 const terms=String(query).trim().split(/[\s,，]+/).map(normalizeSearch).filter(Boolean);
 return terms.length>1&&terms.every(term=>text.includes(term));
}
