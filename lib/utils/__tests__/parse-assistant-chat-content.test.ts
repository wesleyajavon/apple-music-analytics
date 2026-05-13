import { describe, expect, it } from "vitest";
import { parseAssistantChatContent } from "@/lib/utils/parse-assistant-chat-content";

describe("parseAssistantChatContent", () => {
  it("splits packed top-track lists and isolates the date-span summary (Prototype-style reply)", () => {
    const raw =
      "You have listened to Prototype 1593 times across 69 unique tracks. Your top tracks by this artist are:\n\n- LA MAIN (330 listens) - MAGNETOSCOPE (157 listens) - LA CALLE ME CHANTE (92 listens) - LÂCHER LES CHIENS (feat. Melvin Coser & Ryflo) (52 listens) Your listening history with Prototype spans from April 16, 2025, to April 14, 2026.";

    const blocks = parseAssistantChatContent(raw);
    const idx = blocks.findIndex(
      (b) =>
        b.type === "paragraph" &&
        /spans from April 16, 2025/i.test(b.text)
    );
    expect(idx).toBeGreaterThan(-1);
    expect(blocks[idx - 1]?.type === "bulletList").toBe(true);
    expect((blocks[idx - 1] as { items: string[] }).items.length).toBeGreaterThanOrEqual(4);
  });

  it("handles one-line packed replies exactly like the L2B chat transcript", () => {
    const raw =
      `Based on the data, here's a summary of your listening history with L2B: - Total listens: 1451 - Unique tracks: 71 - First listen: April 16, 2025 - Last listen: April 13, 2026 - Top track: "Tu M'en Veux" (224 listens) - Yearly breakdown: - 2025: 1352 listens, 69 unique tracks - 2026: 99 listens, 32 unique tracks Note that the data only goes up to April 16, 2026, so there may be more listens in the future.`;

    const blocks = parseAssistantChatContent(raw);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const bullets = blocks.filter((b) => b.type === "bulletList");
    expect(bullets.length).toBeGreaterThanOrEqual(1);
    const items = (bullets[0] as { items: string[] }).items;
    expect(items.length).toBeGreaterThanOrEqual(5);
  });

  it("unpacks packed L2B-style deep dive into paragraphs and bullet lists", () => {
    const raw = [
      "Based on the data, here's a summary of your listening history with L2B:",
      " - Total listens: 1451 - Unique tracks: 71 - First listen: April 16, 2025",
      "- Last listen: April 13, 2026 - Top track: \"Tu M'en Veux\" (224 listens)",
      "- Yearly breakdown: - 2025: 1352 listens, 69 unique tracks - 2026: 99 listens, 32 unique tracks",
      "Note that the data only goes up to April 16, 2026, so there may be more listens in the future.",
    ].join(" ");

    const blocks = parseAssistantChatContent(raw);
    expect(blocks.some((b) => b.type === "bulletList")).toBe(true);
    const bulletBlock = blocks.find((b) => b.type === "bulletList")!;
    expect(bulletBlock.type).toBe("bulletList");
    expect(
      (bulletBlock as { items: string[] }).items.some((i) =>
        /Total listens:\s*1451/i.test(i)
      )
    ).toBe(true);
    expect(
      (bulletBlock as { items: string[] }).items.some((i) =>
        /Yearly breakdown/i.test(i)
      )
    ).toBe(true);
  });

  it("keeps normal multi-paragraph text stable", () => {
    const raw = "Hello world.\n\n- One\n- Two";
    const blocks = parseAssistantChatContent(raw);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("bulletList");
  });
});
