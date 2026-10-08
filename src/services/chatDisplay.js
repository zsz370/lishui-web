// Evidence workflows emit before their existing final checks. Display only accepted replies.
// Ordinary conversation streams real tokens; recommendation deltas are validated by the server.
export const canDisplayAnswerEvent = event => event?.type === 'complete'
  || event?.type === 'delta' && (event.taskId === 'conversation' || event.verified === true);
