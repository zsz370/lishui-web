const loaders={
 '/guide':()=>import('../pages/Guide.jsx'),'/nodes':()=>import('../pages/Nodes.jsx'),'/nodes/detail':()=>import('../pages/NodeDetail.jsx'),'/atlas':()=>import('../pages/Atlas.jsx'),
 '/itinerary':()=>import('../pages/Itinerary.jsx'),'/login':()=>import('../pages/Account.jsx'),'/services':()=>import('../pages/Services.jsx'),'/culture/dragon':()=>import('../pages/DragonExperience.jsx'),
};
const pending=new Map();
export function loadPage(path){
 if(!pending.has(path)){const request=loaders[path]();pending.set(path,request);request.catch(()=>pending.delete(path));}
 return pending.get(path);
}
export function preloadPage(path){const key=path.startsWith('/nodes/')?'/nodes/detail':path;if(loaders[key])loadPage(key).catch(()=>{});}
