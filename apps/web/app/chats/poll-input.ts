export type PollDraft = { question: string; options: string[] };
export type VoteReceipt = {
  poll_id: string;
  option_id: string | null;
  applied: boolean;
};

export function voteConfirmation(
  receipt: unknown,
  pollId: string,
  requestedOption: string,
  projectedOption: string | null | undefined,
) {
  if (
    !receipt ||
    typeof receipt !== "object" ||
    !("poll_id" in receipt) ||
    !("option_id" in receipt) ||
    !("applied" in receipt)
  )
    return "uncertain";
  const vote = receipt as VoteReceipt;
  if (
    vote.poll_id !== pollId ||
    typeof vote.applied !== "boolean" ||
    (vote.option_id !== null && typeof vote.option_id !== "string")
  )
    return "uncertain";
  if (projectedOption === undefined) return "uncertain";
  if (projectedOption !== requestedOption) return "superseded";
  return vote.option_id === requestedOption ? "current" : "uncertain";
}

export function normalizedPollDraft(
  question: unknown,
  options: unknown,
): PollDraft | null {
  if (typeof question !== "string" || !Array.isArray(options)) return null;
  const cleanQuestion = question.trim();
  const cleanOptions = options.map((value) =>
    typeof value === "string" ? value.trim() : null,
  );
  if (
    cleanQuestion.length < 1 ||
    cleanQuestion.length > 200 ||
    /[\x00-\x1f\x7f]/.test(cleanQuestion) ||
    cleanOptions.length < 2 ||
    cleanOptions.length > 6 ||
    cleanOptions.some(
      (value) => !value || value.length > 100 || /[\x00-\x1f\x7f]/.test(value),
    ) ||
    new Set(cleanOptions).size !== cleanOptions.length
  )
    return null;
  return { question: cleanQuestion, options: cleanOptions as string[] };
}
