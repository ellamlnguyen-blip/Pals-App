import type { DmInboxRow } from "../../lib/dm";

export type CombinedRow =
  | {
      kind: "dm";
      dm: DmInboxRow;
      name: string | null;
      photoRevision: number | null;
      entryTime: string;
      hasUnread: boolean;
    }
  | {
      kind: "hangout";
      id: string;
      title: string;
      emoji: string;
      entryTime: string;
      hasUnread: boolean;
    };
