import type { DmInboxRow } from "../../lib/dm";

export type CombinedRow =
  | {
      kind: "dm";
      dm: DmInboxRow;
      name: string | null;
      photoRevision: number | null;
      entryTime: string;
    }
  | {
      kind: "hangout";
      id: string;
      title: string;
      emoji: string;
      startsAt: string;
      entryTime: string;
    };

export type CombinedCursor = {
  dmTime: string | null;
  dmGeneration: string | null;
  hangoutId: string | null;
  dmDone: boolean;
  hangoutDone: boolean;
};

export const firstCursor: CombinedCursor = {
  dmTime: null,
  dmGeneration: null,
  hangoutId: null,
  dmDone: false,
  hangoutDone: false,
};
