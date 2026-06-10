import type { DuetShareScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DuetShareSettingsDto = {
  userId: string;
  allowFriendRequests: boolean;
  defaultShareScope: DuetShareScope;
};

export type UpdateDuetShareSettingsInput = {
  allowFriendRequests?: boolean;
  defaultShareScope?: DuetShareScope;
};

export async function getOrCreateDuetShareSettings(
  userId: string
): Promise<DuetShareSettingsDto> {
  return prisma.duetShareSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      userId: true,
      allowFriendRequests: true,
      defaultShareScope: true,
    },
  });
}

export async function updateDuetShareSettings(
  userId: string,
  input: UpdateDuetShareSettingsInput
): Promise<DuetShareSettingsDto> {
  await getOrCreateDuetShareSettings(userId);
  return prisma.duetShareSettings.update({
    where: { userId },
    data: {
      ...(input.allowFriendRequests !== undefined && {
        allowFriendRequests: input.allowFriendRequests,
      }),
      ...(input.defaultShareScope !== undefined && {
        defaultShareScope: input.defaultShareScope,
      }),
    },
    select: {
      userId: true,
      allowFriendRequests: true,
      defaultShareScope: true,
    },
  });
}
