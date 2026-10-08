// 当前产品只有淮源姐，退役角色素材与历史记录已归档。
import { agentPersona } from './agentPersona.js';
export const HOST_ID = '01_huaiyuanjie';
export const host = {
  id: HOST_ID, name: agentPersona.name, category: 'guide', color: '#325b46',
  domain: '你的溧水旅行向导', tagline: '山水、乡味、乡里故事，陪你慢慢认识溧水。',
  intro: agentPersona.opening.capabilities,
  destination: '/guide', action: '和淮源姐聊聊', transparent: true,
  portrait: '/assets/personas/transparent/01_huaiyuanjie-poster.webp',
  avatar: '/assets/personas/transparent/01_huaiyuanjie-avatar.webp',
  motionPoster: '/assets/personas/transparent/01_huaiyuanjie-poster.webp',
  portraitMotion: {idle:'/assets/personas/transparent/01_huaiyuanjie-idle.webm',speaking:'/assets/personas/transparent/01_huaiyuanjie-speaking.webm'},
};
export const personas = [host];
export const getPersona = (id = HOST_ID) => id === HOST_ID ? host : undefined;
export const guideUrl = () => '/guide';
export const guideLink = ({nodeId, serviceId, question} = {}) => {
  const params = new URLSearchParams();
  if(nodeId) params.set('node',nodeId); if(serviceId) params.set('service',serviceId); if(question) params.set('q',question);
  return '/guide'+(params.size?'?'+params:'');
};
