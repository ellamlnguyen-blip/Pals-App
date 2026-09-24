export type ResponseContext = {
  generation: number;
  session: number;
  reportId: string | null;
};

export function responseBelongsTo(
  captured: ResponseContext,
  current: ResponseContext,
) {
  return (
    captured.generation === current.generation &&
    captured.session === current.session &&
    captured.reportId === current.reportId
  );
}

export function deniedView() {
  return {
    queue: [],
    history: [],
    detail: null,
    selected: null,
    uncertain: null,
    denied: true,
  };
}

export type QueueCursorRow = {
  report_id: string;
  submitted_at: string;
  target_type: string;
  target_id: string;
};
export function nextCursor<T extends QueueCursorRow>(
  queue: T[],
  pageSize = 24,
) {
  if (queue.length < pageSize) return null;
  const last = queue.at(-1);
  return last ? { afterAt: last.submitted_at, afterId: last.report_id } : null;
}

export function duplicateCandidates<T extends QueueCursorRow>(
  queue: T[],
  detail: QueueCursorRow,
) {
  return queue.filter(
    (q) =>
      q.report_id !== detail.report_id &&
      q.target_type === detail.target_type &&
      q.target_id === detail.target_id &&
      (q.submitted_at < detail.submitted_at ||
        (q.submitted_at === detail.submitted_at &&
          q.report_id < detail.report_id)),
  );
}

export type MutationIntent = {
  op: "case" | "account" | "hangout";
  reportId: string;
  requestId: string;
  revision: number;
  action?: string;
  note?: string | null;
  duplicateId?: string | null;
  reason?: string;
};
export function mutationBody(p: MutationIntent) {
  if (p.op === "hangout")
    return {
      op: p.op,
      reportId: p.reportId,
      requestId: p.requestId,
      revision: p.revision,
      reason: p.reason,
    };
  return p;
}

export function scheduleSelectedFocus(
  reportId: string,
  selected: () => string | null,
  focus: () => void,
  schedule: (callback: () => void) => void,
) {
  schedule(() => {
    if (selected() === reportId) focus();
  });
}
