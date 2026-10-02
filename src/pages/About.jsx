export default function About() {
  return (
    <div className="card p-6 space-y-3 text-sm leading-relaxed">
      <h1 className="font-cn text-2xl">关于作品</h1>
      <p><b>作品名（暂定）</b>：秦淮源头的山水与烟火 · 溧水数字人导览</p>
      <p><b>赛道</b>：2026 数媒竞赛 · 指定赛道（二）AIGC（民族文化为强备选）</p>
      <p><b>核心创新</b>：1 位主控导游 + 11 位专家转接的多智能体编排；RAG 对话讲解；空间化交互（首页会客厅 → 节点详情 → 对话面板 → 行程生成）。</p>
      <p><b>原创贡献</b>：12 位数字人角色、~100 份溧水文旅调研文档、180 条 QA，全部为团队原创。</p>
      <p><b>合规声明</b>：溧水非遗对外统一表述为"约 50–60 项"，级别与年代以官方名录为准；AI 生成/合成内容按规范标识；图片素材逐项登记来源与授权。</p>
      <p><b>与 1010 智能体大赛的边界</b>：知识库同源、成果形态不同——1010 交付的是平台智能体，本作品交付的是沉浸式 Web 交互产品，前端 / 视觉 / 数字人形象 / 演示视频 / 说明文档均为本作品新增的实质性创作。</p>
      <p className="text-xs text-ls-ink/60 pt-4">技术栈：Vite + React + Router + Tailwind · LangGraph 多智能体路由（待接入）· 千问平台 OpenAI 兼容接口（待接入）· Chroma 本地向量（待接入）· Three.js + three-vrm 主控 3D 形象（待接入）。</p>
    </div>
  );
}
