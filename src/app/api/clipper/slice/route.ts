import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg, assertAddon } from "@/lib/tenancy";
import { sliceForPlatform, CLIP_MODE_SPEC } from "@/lib/utility";

const SliceBody = z.object({
  scriptBlockId: z.string().uuid(),
  platformMode:  z.enum(["RETAINER", "EDUCATOR", "DEEP_DIVER"]),
  // Cosmetic label only — platformMode is what drives rendering (see
  // ClipAsset.targetPlatform comment in schema.prisma).
  targetPlatform: z.enum(["SHORTS_OPTIMAL", "REELS_OPTIMAL", "TIKTOK_MID", "YOUTUBE_SHORT_MAX"]),
});

/**
 * POST /api/clipper/slice
 *
 * Gated by hasClipperAddon (§4.3 — à la carte, any paid tier). Takes a
 * finished ScriptBlock, extracts the highest-friction clash point via the
 * utility model (src/lib/utility.ts::sliceForPlatform — gpt-4o-mini, not a
 * standalone Anthropic client; see that file's header comment), and creates
 * a ClipAsset row. Does not render — that's a separate, explicit
 * POST /api/clipper/[id]/render call, same two-step pattern as the main
 * module render flow (generate script → render video are already separate
 * steps there too).
 */
export const POST = tenantRoute(async (ctx, req: Request) => {
  const org = await prisma.organization.findUniqueOrThrow({
    where:  { id: ctx.orgId },
    select: { hasClipperAddon: true },
  });
  assertAddon(org.hasClipperAddon, "hasClipperAddon");

  const parsed = SliceBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { scriptBlockId, platformMode, targetPlatform } = parsed.data;

  const sourceBlock = await prisma.scriptBlock.findUnique({
    where:  { id: scriptBlockId },
    select: { id: true, moduleId: true, textContent: true, imageUrl: true, videoStyle: true, module: { select: { orgId: true } } },
  });
  if (!sourceBlock) {
    return NextResponse.json({ error: "SOURCE_NOT_FOUND" }, { status: 404 });
  }
  assertOrg(sourceBlock.module.orgId, ctx);

  if (sourceBlock.textContent.trim().length < 200) {
    return NextResponse.json(
      {
        error: "SOURCE_TOO_SHORT",
        message: "Source block is too short to extract a meaningful clash point from. Needs at least ~200 characters.",
      },
      { status: 422 }
    );
  }

  let sliced;
  try {
    sliced = await sliceForPlatform(sourceBlock.textContent, platformMode);
  } catch (err) {
    console.error("[clipper] slice failed:", err);
    return NextResponse.json(
      { error: "SLICE_FAILED", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }

  const clip = await prisma.clipAsset.create({
    data: {
      moduleId:            sourceBlock.moduleId,
      sourceScriptBlockId: sourceBlock.id,
      platformMode,
      targetPlatform,
      sectionTitle:        sliced.sectionTitle,
      textContent:         sliced.textContent,
      beats:               sliced.beats,
      ctaText:             sliced.ctaText,
      videoStyle:          sourceBlock.videoStyle,
      sourceImageUrl:      sourceBlock.imageUrl,
      mediaStatus:         "PENDING",
    },
  });

  return NextResponse.json(
    {
      clipAssetId: clip.id,
      sectionTitle: clip.sectionTitle,
      beats: sliced.beats,
      ctaText: sliced.ctaText,
      beatCount: sliced.beats.length,
      expectedDurationRange: modeRangeLabel(platformMode),
    },
    { status: 201 }
  );
});

function modeRangeLabel(mode: keyof typeof CLIP_MODE_SPEC): string {
  return { RETAINER: "15–30s", EDUCATOR: "45–60s", DEEP_DIVER: "90s–3m" }[mode];
}
