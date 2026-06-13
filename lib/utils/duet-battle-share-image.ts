import {
  generateHeadToHeadSharePng,
  renderHeadToHeadShareCard,
} from "@/lib/utils/share-card/head-to-head-share-card";

export type DuetBattleShareImageInput = {
  arenaLabel: string;
  entityName: string;
  entitySubtitle?: string;
  viewerName: string;
  friendName: string;
  viewerAvatarUrl?: string | null;
  friendAvatarUrl?: string | null;
  selfCount: number;
  friendCount: number;
  winner: "self" | "friend" | "tie";
  winnerHeadline: string;
  selfLabel: string;
  friendLabel: string;
  brandName: string;
  brandTagline: string;
  entityImageUrl?: string | null;
};

function toHeadToHeadInput(input: DuetBattleShareImageInput) {
  return {
    eyebrowLabel: input.arenaLabel,
    title: input.entityName,
    subtitle: input.entitySubtitle,
    viewerName: input.viewerName,
    friendName: input.friendName,
    viewerAvatarUrl: input.viewerAvatarUrl,
    friendAvatarUrl: input.friendAvatarUrl,
    selfCount: input.selfCount,
    friendCount: input.friendCount,
    winner: input.winner,
    winnerHeadline: input.winnerHeadline,
    selfLabel: input.selfLabel,
    friendLabel: input.friendLabel,
    brandName: input.brandName,
    brandTagline: input.brandTagline,
    entityImageUrl: input.entityImageUrl,
  };
}

export async function renderDuetBattleShareImage(
  input: DuetBattleShareImageInput
): Promise<HTMLCanvasElement> {
  return renderHeadToHeadShareCard(toHeadToHeadInput(input));
}

export async function generateDuetBattleSharePng(input: DuetBattleShareImageInput): Promise<Blob> {
  return generateHeadToHeadSharePng(toHeadToHeadInput(input));
}
