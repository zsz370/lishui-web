import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass, ChatCircleDots, MapTrifold } from '@phosphor-icons/react';
import Photo from '../components/Photo.jsx';
import GuideAvatar from '../components/GuideAvatar.jsx';
import { getPersona, guideUrl } from '../data/personas.js';
import { ticketQA } from '../data/ticketReference.js';

const steps = [
  { icon: Compass, title: '先选一种喜欢的逛法', text: '从山水、美食、乡里故事或慢游出发，每个栏目都为你整理了几个容易上手的主题。' },
  { icon: ChatCircleDots, title: '有好奇的，就问导游', text: '淮源姐迎接你，伙伴们也会回答住宿、天气、交通和日常需求。从旅途服务入口选择主题，或在地点介绍页直接提问。' },
  { icon: MapTrifold, title: '把心动留在行程里', text: '将喜欢的地方加入行程，按自己的节奏挑选，再复制成一份随身的小清单。' },
];
export default function About() {
  return <div className="about-experience">
    <section className="about-intro"><Photo src="/assets/catalog/lake-dongping.webp" alt="东屏湖水面与湖畔树林" eager /><div><p className="section-overline">遇见美溧</p><h1>把风景慢慢看，<br />把故事慢慢听。</h1><p>“遇见美溧”是一份陪你认识溧水的数字导览。愿你在秦淮源头，找到适合自己的逛法，也遇见喜欢的山水与烟火。</p><Link className="experience-button" to="/nodes">开始探索 <ArrowUpRight size={17} aria-hidden="true" /></Link></div></section>
    <section className="about-how"><div className="section-heading"><h2>第一次来，可以这样逛</h2></div><ol>{steps.map((step, index) => {
      const Icon = step.icon;
      return <li key={step.title}><span className="about-step-number">0{index + 1}</span><Icon size={24} weight="light" aria-hidden="true" /><div><h3>{step.title}</h3><p>{step.text}</p></div></li>;
    })}</ol></section>
    <section className="about-kind-note"><h2>出发前的一点小提醒</h2><p>天气、开放时间、交通与票价可能变化，出发前请留意景区及有关部门的最新公告。地方传说作为故事欣赏，具体历史与项目级别以正式资料为准。</p></section>
    <section className="about-kind-note" aria-labelledby="ticket-reference"><h2 id="ticket-reference">门票参考与核对范围</h2><p>下列参考价由项目负责人于2026年10月5日提供并确认优惠范围，供比较游览方案；未连接实时售票接口，出行日价格、票种和证件条件请向景区确认。</p>{ticketQA.map((qa) => <details key={qa.id}><summary>{qa.q}</summary><p>{qa.a}</p></details>)}</section>
    <section className="about-kind-note" aria-labelledby="data-use"><h2 id="data-use">提问与行程怎样保存</h2><p>已审固定问答可在页面直接回答。需要检索或实时查询时，问题、最近最多6条对话和已填写的出行条件会发送给本站后端，再按需求调用相关服务。本站后端不建立对话数据库；页面对话在离开或刷新后结束。</p><p>浏览器允许保存时，行程保存在当前浏览器，刷新后可继续编辑；存储受限时，页面会提示在离开前复制文字或保存图片。到<Link to="/itinerary">我的行程</Link>点击“清空行程”，可清除已填出行条件与地点；这不会清除已经发送给外部服务的数据。</p><details><summary>查看查询服务与临时记录</summary><p>地方检索与答复整理使用硅基流动；联网资料使用博查；天气使用和风天气；地点及路线使用高德地图；住宿条件使用飞猪；译文使用百度翻译。模型可收到问题与相关证据，其他服务仅收到相应的查询词、地点、日期预算或待译文字。未配置或失败的服务会显示未完成。</p><p>后端内存最多缓存100个检索问题及其向量，随进程重启清除。应用日志记录请求编号、接口、耗时、状态和取消情况，不写入问题正文。服务器日志按日轮转：应用日志保留7份归档，访问日志保留14份归档，当天记录仍可能存在。Cloudflare及其他服务的留存以各自政策为准，本页不承诺第三方记录已被删除。请尽量用出行需求提问，无需填写身份证或账户密码。</p></details></section>
    <div className="collection-companions"><Link to="/services">看看完整旅途服务 <ArrowUpRight size={15} aria-hidden="true" /></Link>{['08_wuxiangsao', '09_shijiulang', '11_dongpingjie', '12_dongluke'].map((id) => <Link key={id} to={guideUrl(id)}><GuideAvatar persona={getPersona(id)} /><span>{getPersona(id).name}</span></Link>)}</div>
    <section className="about-kind-note"><h2>文化任务的体验记录</h2><p>骆山大龙文化小任务只在当前浏览器保存最近一次的选项、得分和用时，不自动上传。可在<Link to="/culture/dragon">文化任务页</Link>清除或主动下载；浏览器禁止存储时仍可完成并下载。得分用于回看本次选择，不作为学习效果结论。河线与停靠点图形为原创叙事示意，不是历史原物或实际水系地图。</p></section>
    <section className="about-kind-note"><h2>团队与制作</h2><p>队长张潘赫负责网页搭建、智能体搭建与部署上线工作；队员张晨钰负责知识库、图片资料、智能体形象与文案。团队说明本次作品由成员自行搭建，未复用旧参赛成果。</p><p>制作中使用Qoder辅助资料整理、查询、代码完善与形象修缮，并使用Codex协助本轮开发与验证。数字人形象为AI生成；地方事实与项目级别以对应出处为准，人工整理及制作过程记录持续归档。</p><p>淮源姐的答复支持主动朗读，使用设备本地中文声音，不代表团队成员或角色本人的录音。可随时停止或重播；没有可用声音时仍可阅读原文。</p></section>
    <p className="about-ai-note">数字人形象为 AI 生成，讲解与资料仅供游览参考。欢迎你带着好奇来，也带着自己的故事回去。</p>
  </div>;
}
