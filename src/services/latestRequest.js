// A response belongs to the conditions and view that launched it, even if abort is ignored upstream.
export function createLatestRequest() {
  let active, generation = 0;
  const cancel = () => { generation++; active?.controller.abort(); active = undefined; };
  return {
    cancel,
    begin() { cancel(); active = { generation, controller: new AbortController() }; return active; },
    current(ticket) { return Boolean(ticket && ticket.generation === generation && !ticket.controller.signal.aborted); },
  };
}
