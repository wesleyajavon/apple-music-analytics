"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient, type ParsedRateLimitHeaders } from "@/lib/api-client";
import type {
  MusicChatDateRangeContext,
  MusicChatMessage,
  MusicChatPresetArgs,
  MusicChatPresetQuestionId,
  MusicChatResponse,
} from "@/lib/dto/music-chat";

export type MusicChatUiResponse = MusicChatResponse & {
  rateLimit?: ParsedRateLimitHeaders;
};

export type SendMusicChatInput = {
  messages: MusicChatMessage[];
  locale: string;
  userId?: string;
  presetQuestionId?: MusicChatPresetQuestionId;
  presetArgs?: MusicChatPresetArgs;
  dateRange?: MusicChatDateRangeContext;
};

function withUserIdQuery(path: string, userId?: string): string {
  if (!userId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}userId=${encodeURIComponent(userId)}`;
}

async function sendMusicChatMessage({
  messages,
  locale,
  userId,
  presetQuestionId,
  presetArgs,
  dateRange,
}: SendMusicChatInput): Promise<MusicChatUiResponse> {
  const result = await apiClient.postWithMeta<MusicChatResponse>(
    withUserIdQuery("/ai/music-chat", userId),
    {
      messages,
      locale,
      presetQuestionId,
      presetArgs,
      dateRange,
    },
    {
      /** Tool rounds + Groq + DB — align with `maxDuration` on the API route */
      timeout: 180_000,
      retries: 0,
    }
  );

  return {
    ...result.data,
    rateLimit: result.rateLimit,
  };
}

export function useMusicChat() {
  return useMutation({
    mutationFn: sendMusicChatMessage,
  });
}
