export const scoreFields = ['taskCompletion', 'factTotal', 'factSupported', 'factUnknown', 'citationTotal', 'citationSupported', 'citationUnknown', 'missedConstraints'];

export function validateScore(score) {
  const errors = [];
  if (!score || typeof score !== 'object') return ['评分格式错误'];
  if (!score.reviewer?.trim()) errors.push('请填评审代号');
  for (const key of ['taskCompletion', 'factTotal', 'factSupported', 'factUnknown', 'citationTotal', 'citationSupported', 'citationUnknown', 'missedConstraints']) {
    if (!Number.isSafeInteger(score[key]) || score[key] < 0) errors.push(`${key}须明确填写非负整数，空白不计零分`);
  }
  if (score.taskCompletion > 2) errors.push('任务完成度只能为0、1或2');
  for (const prefix of ['fact', 'citation']) {
    if (score[`${prefix}Supported`] + score[`${prefix}Unknown`] > score[`${prefix}Total`]) errors.push(`${prefix}支持与待核数量之和不能超过总数`);
  }
  if (score.dispute && !score.notes?.trim()) errors.push('争议项请写明原句、证据与争议理由');
  return errors;
}

export function validateReviewExport(value, packId, allowedIds) {
  if (!value || value.packId !== packId || !Array.isArray(value.records)) throw new Error('评分文件与这批历史输出不匹配');
  const seen = new Set();
  for (const record of value.records) {
    if (!allowedIds.includes(record.reviewId) || seen.has(record.reviewId)) throw new Error('评分编号未知或重复');
    seen.add(record.reviewId);
    if (validateScore(record).length || !record.reviewedAt) throw new Error('已确认评分字段不完整或范围不合法');
  }
  return value.records;
}
