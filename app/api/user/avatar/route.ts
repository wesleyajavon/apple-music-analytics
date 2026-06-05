import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/avatar";
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

const AVATAR_RATE = {
  route: ROUTE,
  windowMs: 60_000,
  maxRequests: 20,
} as const;

function isSupportedAvatarType(
  type: string
): type is keyof typeof AVATAR_MIME_EXTENSIONS {
  return type in AVATAR_MIME_EXTENSIONS;
}

function getAvatarPath(userId: string, contentType: keyof typeof AVATAR_MIME_EXTENSIONS) {
  return `${userId}/avatar.${AVATAR_MIME_EXTENSIONS[contentType]}`;
}

function getAvatarCandidatePaths(userId: string) {
  return Object.values(AVATAR_MIME_EXTENSIONS).map((ext) => `${userId}/avatar.${ext}`);
}

function getStoragePathFromPublicUrl(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = avatarUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const rawPath = avatarUrl.slice(markerIndex + marker.length).split("?")[0];
  if (!rawPath) return null;

  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

async function syncAvatarMetadata(avatarUrl: string | null) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl, picture: avatarUrl },
  });

  if (error) {
    logger.warn("Supabase auth.updateUser failed when updating avatar", {
      err: error,
      route: ROUTE,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rl = await assertRateLimit(request, { ...AVATAR_RATE, userId });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const avatar = formData.get("avatar");
    if (!(avatar instanceof File)) {
      return NextResponse.json(
        { error: "Avatar file is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!isSupportedAvatarType(avatar.type)) {
      return NextResponse.json(
        { error: "Unsupported image type", code: "UNSUPPORTED_MEDIA_TYPE" },
        { status: 415 }
      );
    }

    if (avatar.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Avatar must be 2 MB or smaller", code: "FILE_TOO_LARGE" },
        { status: 413 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const bucket = supabase.storage.from(AVATAR_BUCKET);
    const avatarPath = getAvatarPath(userId, avatar.type);

    const { error: uploadError } = await bucket.upload(avatarPath, avatar, {
      contentType: avatar.type,
      upsert: true,
    });

    if (uploadError) {
      logger.warn("Supabase avatar upload failed", {
        err: uploadError,
        route: ROUTE,
      });
      return NextResponse.json(
        { error: uploadError.message, code: "AVATAR_UPLOAD_FAILED" },
        { status: 502 }
      );
    }

    const stalePaths = getAvatarCandidatePaths(userId).filter(
      (path) => path !== avatarPath
    );
    await bucket.remove(stalePaths);

    const {
      data: { publicUrl },
    } = bucket.getPublicUrl(avatarPath);
    const avatarUrl = `${publicUrl}?v=${Date.now()}`;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { name: true, email: true, avatarUrl: true },
    });

    await syncAvatarMetadata(avatarUrl);

    return NextResponse.json({
      user: {
        name: updated.name,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rl = await assertRateLimit(request, { ...AVATAR_RATE, userId });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const paths = new Set(getAvatarCandidatePaths(userId));
    const currentPath = getStoragePathFromPublicUrl(user?.avatarUrl);
    if (currentPath) paths.add(currentPath);

    const supabase = await createSupabaseServerClient();
    const { error: removeError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([...paths]);

    if (removeError) {
      logger.warn("Supabase avatar delete failed", {
        err: removeError,
        route: ROUTE,
      });
      return NextResponse.json(
        { error: removeError.message, code: "AVATAR_DELETE_FAILED" },
        { status: 502 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { name: true, email: true, avatarUrl: true },
    });

    await syncAvatarMetadata(null);

    return NextResponse.json({
      user: {
        name: updated.name,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
