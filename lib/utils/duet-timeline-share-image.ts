import {
  generateHeadToHeadSharePng,
  renderHeadToHeadShareCard,
} from "@/lib/utils/share-card/head-to-head-share-card";

export type DuetTimelineShareImageInput = {
  arenaLabel: string;
  title: string;
  subtitle?: string;
  viewerName: string;
  friendName: string;
  selfTotal: number;
  friendTotal: number;
  winner: "self" | "friend" | "tie";
  winnerHeadline: string;
  selfLabel: string;
  friendLabel: string;
  brandName: string;
  brandTagline: string;
};

function toHeadToHeadInput(input: DuetTimelineShareImageInput) {
  return {
    eyebrowLabel: input.arenaLabel,
    title: input.title,
    subtitle: input.subtitle,
    viewerName: input.viewerName,
    friendName: input.friendName,
    selfCount: input.selfTotal,
    friendCount: input.friendTotal,
    winner: input.winner,
    winnerHeadline: input.winnerHeadline,
    selfLabel: input.selfLabel,
    friendLabel: input.friendLabel,
    brandName: input.brandName,
    brandTagline: input.brandTagline,
  };
}

export function renderDuetTimelineShareImage(
  input: DuetTimelineShareImageInput
): HTMLCanvasElement {
  return renderHeadToHeadShareCard(toHeadToHeadInput(input));
}

export async function generateDuetTimelineSharePng(
  input: DuetTimelineShareImageInput
): Promise<Blob> {
  return generateHeadToHeadSharePng(toHeadToHeadInput(input));
}

export function resolveDuetTimelineWinner(
  selfTotal: number,
  friendTotal: number
): "self" | "friend" | "tie" {
  if (selfTotal > friendTotal) return "self";
  if (friendTotal > selfTotal) return "friend";
  return "tie";
}
