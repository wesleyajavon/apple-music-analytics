import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListenRecordSource } from "@/lib/constants/listen-source";
import type { NormalizedListenInput } from "./onboarding-import-types";

const OR_CHUNK = 80;
const CREATE_MANY_CHUNK = 2000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function importOnboardingListens(
  userId: string,
  source: ListenRecordSource,
  rows: NormalizedListenInput[]
): Promise<{
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
}> {
  let skippedInvalid = 0;
  const seen = new Set<string>();
  const valid: NormalizedListenInput[] = [];

  for (const row of rows) {
    const a = row.artistName?.trim();
    const tr = row.trackName?.trim();
    if (!a || !tr) {
      skippedInvalid++;
      continue;
    }
    const dedupeKey = `${a.toLowerCase()}\0${tr.toLowerCase()}\0${row.playedAt.getTime()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    valid.push({ artistName: a, trackName: tr, playedAt: row.playedAt });
  }

  if (valid.length === 0) {
    return { imported: 0, skippedDuplicates: 0, skippedInvalid };
  }

  const artistCanonical = new Map<string, string>();
  for (const v of valid) {
    const low = v.artistName.toLowerCase();
    if (!artistCanonical.has(low)) artistCanonical.set(low, v.artistName);
  }
  const uniqueArtistLowers = [...artistCanonical.keys()];

  const existingArtists = await prisma.artist.findMany({
    where: { nameLower: { in: uniqueArtistLowers } },
    select: { id: true, nameLower: true },
  });
  const existingLowerSet = new Set(existingArtists.map((a) => a.nameLower));
  const missingArtistLowers = uniqueArtistLowers.filter(
    (low) => !existingLowerSet.has(low)
  );

  if (missingArtistLowers.length > 0) {
    await prisma.artist.createMany({
      data: missingArtistLowers.map((low) => ({
        name: artistCanonical.get(low)!,
        nameLower: low,
      })),
      skipDuplicates: true,
    });
  }

  const allArtists = await prisma.artist.findMany({
    where: { nameLower: { in: uniqueArtistLowers } },
    select: { id: true, nameLower: true },
  });
  const artistMap = new Map(allArtists.map((a) => [a.nameLower, a.id]));

  type TrackSpec = { artistId: string; title: string; titleLower: string };
  const trackSpecByKey = new Map<string, TrackSpec>();
  for (const v of valid) {
    const aid = artistMap.get(v.artistName.toLowerCase());
    if (!aid) continue;
    const titleLower = v.trackName.toLowerCase();
    const tk = `${aid}\0${titleLower}`;
    if (!trackSpecByKey.has(tk)) {
      trackSpecByKey.set(tk, {
        artistId: aid,
        title: v.trackName,
        titleLower,
      });
    }
  }

  const trackSpecs = [...trackSpecByKey.values()];
  const trackMap = new Map<string, string>();

  for (const part of chunk(trackSpecs, OR_CHUNK)) {
    const found = await prisma.track.findMany({
      where: {
        OR: part.map((p) => ({
          artistId: p.artistId,
          titleLower: p.titleLower,
        })),
      },
      select: { id: true, artistId: true, titleLower: true },
    });
    for (const t of found) {
      trackMap.set(`${t.artistId}\0${t.titleLower}`, t.id);
    }
  }

  const missingTracks = trackSpecs.filter(
    (p) => !trackMap.has(`${p.artistId}\0${p.titleLower}`)
  );
  if (missingTracks.length > 0) {
    await prisma.track.createMany({
      data: missingTracks.map((p) => ({
        artistId: p.artistId,
        title: p.title,
        titleLower: p.titleLower,
      })),
      skipDuplicates: true,
    });

    for (const part of chunk(missingTracks, OR_CHUNK)) {
      const found = await prisma.track.findMany({
        where: {
          OR: part.map((p) => ({
            artistId: p.artistId,
            titleLower: p.titleLower,
          })),
        },
        select: { id: true, artistId: true, titleLower: true },
      });
      for (const t of found) {
        trackMap.set(`${t.artistId}\0${t.titleLower}`, t.id);
      }
    }
  }

  type Resolved = { trackId: string; playedAt: Date };
  const resolved: Resolved[] = [];
  for (const v of valid) {
    const aid = artistMap.get(v.artistName.toLowerCase());
    if (!aid) continue;
    const tid = trackMap.get(`${aid}\0${v.trackName.toLowerCase()}`);
    if (!tid) continue;
    resolved.push({ trackId: tid, playedAt: v.playedAt });
  }

  if (resolved.length === 0) {
    return { imported: 0, skippedDuplicates: 0, skippedInvalid };
  }

  const byDay = new Map<string, Resolved[]>();
  for (const r of resolved) {
    const day = r.playedAt.toISOString().slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(r);
    byDay.set(day, list);
  }

  let imported = 0;
  let skippedDuplicates = 0;

  for (const [day, items] of byDay) {
    const [y, mo, d] = day.split("-").map(Number);
    const dayStart = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
    const trackIds = [...new Set(items.map((i) => i.trackId))];

    const existing = await prisma.listen.findMany({
      where: {
        userId,
        source,
        playedAt: { gte: dayStart, lte: dayEnd },
        trackId: { in: trackIds },
      },
      select: { trackId: true, playedAt: true },
    });
    const existingKeys = new Set(
      existing.map((e) => `${e.trackId}:${e.playedAt.getTime()}`)
    );

    const toCreate: Prisma.ListenCreateManyInput[] = [];
    for (const item of items) {
      const key = `${item.trackId}:${item.playedAt.getTime()}`;
      if (existingKeys.has(key)) {
        skippedDuplicates++;
        continue;
      }
      existingKeys.add(key);
      toCreate.push({
        userId,
        trackId: item.trackId,
        playedAt: item.playedAt,
        source,
      });
    }

    for (let i = 0; i < toCreate.length; i += CREATE_MANY_CHUNK) {
      const slice = toCreate.slice(i, i + CREATE_MANY_CHUNK);
      if (slice.length === 0) continue;
      await prisma.listen.createMany({ data: slice });
      imported += slice.length;
    }
  }

  return { imported, skippedDuplicates, skippedInvalid };
}
