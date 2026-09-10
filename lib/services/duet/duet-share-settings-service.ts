import { prisma } from "@/lib/prisma";

export type DuetShareSettingsDto = {
  userId: string;
  allowFriendRequests: boolean;
};

export type UpdateDuetShareSettingsInput = {
  allowFriendRequests?: boolean;
};

export async function getOrCreateDuetShareSettings(
  userId: string
): Promise<DuetShareSettingsDto> {
  const row = await prisma.duetShareSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      userId: true,
      allowFriendRequests: true,
    },
  });
  return row;
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
    },
    select: {
      userId: true,
      allowFriendRequests: true,
    },
  });
}
