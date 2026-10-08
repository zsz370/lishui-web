// 首页不预载问答语料与答复处理；第一次提问才载入，后续会话复用同一模块。
export function createDeferredChat(load = () => import('./chat.js')) {
  let pendingModule;
  return async function ask(options) {
    options.signal?.throwIfAborted();
    if (!pendingModule) {
      pendingModule = Promise.resolve().then(load).catch(() => {
        pendingModule = undefined;
        throw new Error('问答暂时无法加载，请刷新页面后重试。');
      });
    }
    const chat = await pendingModule;
    options.signal?.throwIfAborted();
    return chat.ask(options);
  };
}

export const askDeferred = createDeferredChat();
