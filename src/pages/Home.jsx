import { Link } from 'react-router-dom';
import { mainNodes } from '../data/nodes.js';
import { personas, HOST_ID } from '../data/personas.js';
import NodeCard from '../components/NodeCard.jsx';
import { useItinerary } from '../data/store.jsx';

export default function Home() {
  const { items, add } = useItinerary();
  const host = personas.find((p) => p.id === HOST_ID);
  return (
    <div className="space-y-8">
      <section className="card p-6 md:p-10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-56 h-56 rounded-full bg-ls-lake/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 space-y-3">
            <div className="text-xs tracking-widest text-ls-fire">2026 数媒竞赛 · 参赛作品</div>
            <h1 className="font-cn text-3xl md:text-4xl leading-snug">
              秦淮源头的山水与烟火<br />
              <span className="text-ls-lake">溧水寻味之旅</span>
            </h1>
            <p className="text-sm md:text-base text-ls-ink/80 leading-relaxed">
              12 位原创溧水数字人导游 · 多智能体路由 · RAG 对话讲解 · 生成可分享的行程卡片。<br />
              非遗约 50–60 项（国家级 1、省级 3、市级十余项、区级数十项），景点、美食、民俗一站串起。
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/nodes" className="btn-primary">开始逛</Link>
              <Link to="/itinerary" className="btn-ghost">我的行程 ({items.length})</Link>
              <Link to="/about" className="btn-ghost text-ls-ink/70">关于作品</Link>
            </div>
          </div>
          <div className="w-40 md:w-52 shrink-0">
            <div className="card aspect-[3/4] bg-ls-mist grid place-items-center relative">
              <img src={host.avatar} alt={host.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <div className="text-sm">{host.name} · 主控导游</div>
                <div className="text-[10px] text-ls-ink/50">点击专家头像气泡，随时转接</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-cn text-xl mb-3 flex items-center gap-2">
          <span>首发主打 · 4 个必逛节点</span>
          <span className="text-xs text-ls-ink/50">（按"值得游玩程度"依次排列）</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {mainNodes.map((n) => <NodeCard key={n.id} node={n} />)}
        </div>
      </section>

      <section>
        <h2 className="font-cn text-xl mb-3">专家矩阵 · 12 位数字人</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {personas.map((p) => (
            <div key={p.id} className="card p-2 text-center">
              <div className="aspect-square rounded-lg mb-1 grid place-items-center text-white text-lg font-cn" style={{ background: p.color }}>
                <img src={p.avatar} alt={p.name} className="w-full h-full rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <span className="absolute">{p.name[0]}</span>
              </div>
              <div className="text-xs font-medium">{p.name}</div>
              <div className="text-[10px] text-ls-ink/60">{p.domain}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="text-xs text-ls-ink/60">
        <div className="card p-4 space-y-1">
          <div className="text-ls-ink font-medium text-sm">关于数据的合规口径</div>
          <div>· 知识库全部为团队原创调研（12 人设 / ~100 文档 / 180 条 QA）。</div>
          <div>· 溧水非遗对外统一表述为"约 50–60 项"，不写死精确数；具体级别、年代以官方名录为准。</div>
          <div>· 校官碑、中山毫等属文物保护口径，不列入非遗。</div>
          <div>· AI 生成/合成内容按规范标识；图片来源逐项登记于《素材授权台账》。</div>
        </div>
      </section>
    </div>
  );
}
