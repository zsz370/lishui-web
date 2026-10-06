import { queryQA } from './presetQA.js';

export const DRAGON_RESULT_KEY = 'lishui-dragon-experience-v1';
export const dragonTaskVersion = '2026-10-04.1';
const definitions = [
  { id: 'identity', title: '先认清它的名字', question: '正式名录里的骆山大龙，属于哪一类、哪一级？', observation: '看资料，先找项目全称和名录身份。地方昵称可以帮助记忆，正式身份仍以名录为准。', reference: '骆山大龙是几级非遗？', options: ['国家级非遗的龙舞项目', '国家级非遗的传统音乐项目', '只有民间昵称，尚无正式名录身份'], correct: 0 },
  { id: 'scale', title: '再看一条龙背后的人', question: '资料中“24节、约500人”的描述，可以怎样使用？', observation: '长近百米的龙并非一人舞动。舞龙之外，还有掌旗、掌灯与伴奏等工作；读规模时，要留意它描述的时间和范围。', reference: '骆山大龙有多大？', options: ['能保证今天每场演出都有500人', '是传统形制的记载，不保证每场当代演出规模相同', '表示所有参与者都只负责舞龙'], correct: 1 },
  { id: 'legend', title: '把故事和史实分开', question: '杨培庵救下断尾小白龙的故事，应怎样向同行者讲述？', observation: '资料用一则救龙故事解释断尾形制。故事传递乡情，讲述时也要说明材料的性质。', reference: '骆山大龙为什么是断尾的？', options: ['当作已经证实的真实救龙事件', '据此推断今年的表演日期', '说明这是民间传说，用来理解断尾形制'], correct: 2 },
];
export const dragonQuestions = definitions.map((item) => {
  const qa = queryQA('c_ldl', item.reference);
  return { ...item, explanation: qa?.a || '资料暂不可用，请返回名片查看。', referenceId: qa?.id, sources: qa?.sources || [] };
});
export function createDragonResult(answers, startedAt, completedAt = Date.now()) {
  if (answers.length !== dragonQuestions.length || answers.some((answer, index) => !Number.isInteger(answer) || !dragonQuestions[index].options[answer])) return null;
  return { version: dragonTaskVersion, taskId: 'luoshan-dragon', startedAt: new Date(startedAt).toISOString(), completedAt: new Date(completedAt).toISOString(), elapsedSeconds: Math.max(0, Math.round((completedAt - startedAt) / 1000)), score: answers.filter((answer, index) => answer === dragonQuestions[index].correct).length, total: dragonQuestions.length, answers: answers.map((choice, index) => ({ questionId: dragonQuestions[index].id, choice, correct: choice === dragonQuestions[index].correct, referenceId: dragonQuestions[index].referenceId })), scope: '当前浏览器的一次文化任务记录；不代表学习效果或游客研究' };
}
export function readDragonResult(storage) {
  try {
    const raw = JSON.parse(storage.getItem(DRAGON_RESULT_KEY) || 'null');
    if (raw?.version !== dragonTaskVersion || raw?.taskId !== 'luoshan-dragon' || !Array.isArray(raw.answers) || raw.answers.some((answer, index) => answer?.questionId !== dragonQuestions[index]?.id)) return null;
    const start = Date.parse(raw.startedAt), finish = Date.parse(raw.completedAt);
    if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) return null;
    return createDragonResult(raw.answers.map((answer) => answer.choice), start, finish);
  } catch { return null; }
}
export function saveDragonResult(storage, result) {
  try { storage.setItem(DRAGON_RESULT_KEY, JSON.stringify(result)); return true; } catch { return false; }
}
