import React from "react";
import { Composition, getInputProps } from "remotion";
import type { LectureInputProps, ClipInputProps } from "./types";
import { TARGET_DIMENSIONS, BLOCK_DURATION_FRAMES, TITLE_CARD_FRAMES } from "./types";
import { FacelessSequence } from "./FacelessSequence";
import { AvatarSequence   } from "./AvatarSequence";
import { WhiteboardSequence } from "./WhiteboardSequence";
import { ClipperSequence, clipDurationInFrames } from "./ClipperSequence";

/**
 * ContentStormLecture — the root Remotion composition.
 *
 * Registered once; the `inputProps` passed by renderMediaOnLambda determine:
 *   - Dimensions  (from `target`)
 *   - Duration    (title card + blocks × 10s at 30fps)
 *   - Modality    (dominant video style in the block set)
 *   - Watermark   (from `watermark` boolean)
 *
 * Modality routing:
 *   ≥ 50% AVATAR blocks     → AvatarSequence
 *   ≥ 1  WHITEBOARD block   → WhiteboardSequence for that block (others → Faceless)
 *   Default                  → FacelessSequence
 *
 * In practice, auto-match produces exactly 1 WHITEBOARD block (the contradiction
 * map) and 2 AVATAR blocks (persona debates). The routing picks the dominant
 * style — FACELESS wins unless AVATAR > WHITEBOARD.
 *
 * For Hard Override ("make entire module AVATAR"), all blocks carry the same
 * videoStyle and the dominant wins trivially.
 */

export function ContentStormLecture({ inputProps }: { inputProps: LectureInputProps }) {
  const { blocks, target } = inputProps;

  const avatarCount     = blocks.filter((b) => b.videoStyle === "AVATAR").length;
  const whiteboardCount = blocks.filter((b) => b.videoStyle === "WHITEBOARD").length;

  // Routing logic.
  if (avatarCount >= Math.ceil(blocks.length / 2)) {
    return <AvatarSequence props={inputProps} />;
  }
  if (whiteboardCount > 0 && whiteboardCount >= avatarCount) {
    return <WhiteboardSequence props={inputProps} />;
  }
  return <FacelessSequence props={inputProps} />;
}

// ── The Arbitrage Clipper (V2-10) ───────────────────────────────────────────
// Always MOBILE_9_16 — clips are vertical shorts by definition, unlike the
// main lecture, which is target-selectable. Registered as a second, separate
// composition rather than folded into ContentStormLecture's routing, since a
// clip render only ever needs one ClipAsset's beats, not a full block set.
const clipDefaultProps: ClipInputProps = {
  moduleId:      "demo",
  clipAssetId:   "demo-clip",
  sectionTitle:  "The Clash Nobody Resolves",
  platformMode:  "EDUCATOR",
  beats: [
    "MCP standardises AI context retrieval — or so the pitch goes.",
    "The Practitioner calls it an operational nightmare: stateful connections fail silently in production. The Academic calls it elegant: it solves the N-by-M integration problem outright.",
    "Neither side has deployed the same system. That's the blind spot nobody's pricing in.",
  ],
  ctaText:        "Defend your synthesis in the Challenge Chamber",
  sourceImageUrl: null,
  videoStyle:     "FACELESS",
  watermark:      true,
};

function ContentStormClipComposition() {
  const dims = TARGET_DIMENSIONS.MOBILE_9_16;
  return (
    <Composition
      id="ContentStormClip"
      component={ClipperSequence}
      durationInFrames={clipDurationInFrames(clipDefaultProps)}
      fps={30}
      width={dims.width}
      height={dims.height}
      defaultProps={{ props: clipDefaultProps }}
      calculateMetadata={({ props }) => {
        const p = (props as { props: ClipInputProps }).props;
        return { durationInFrames: clipDurationInFrames(p) };
      }}
    />
  );
}

// ── Registration (called by Remotion bundler) ─────────────────────────────────

export function RemotionRoot() {
  // Default props for Remotion Studio / local render.
  const defaultProps: LectureInputProps = {
    moduleId:  "demo",
    title:     "The Integration of MCP Servers for AI Tool Calling",
    watermark: true,
    target:    "LMS_16_9",
    blocks: [
      { id: "b0", order: 0, sectionTitle: "The Stakes",          videoStyle: "FACELESS",    imageUrl: null, textContent: "Model Context Protocol forces a reckoning with how enterprise systems integrate AI context. The debate is not resolved — the field is split." },
      { id: "b1", order: 1, sectionTitle: "The Practitioner",    videoStyle: "AVATAR",      imageUrl: null, textContent: "MCP is an operational nightmare in production. Stateful connections fail silently. Custom middleware is the only survival tool." },
      { id: "b2", order: 2, sectionTitle: "The Academic",        videoStyle: "AVATAR",      imageUrl: null, textContent: "MCP elegantly solves the N×M integration problem by standardising the client-server architecture for AI context retrieval." },
      { id: "b3", order: 3, sectionTitle: "The Skeptic",         videoStyle: "AVATAR",      imageUrl: null, textContent: "Standardised endpoints are a prompt injection superhighway. A tricked model gets a frictionless path to your file system." },
      { id: "b4", order: 4, sectionTitle: "The Economist",       videoStyle: "AVATAR",      imageUrl: null, textContent: "MCP commoditises the middleware layer. Value shifts to the token compute provider. Zapier's business model ends." },
      { id: "b5", order: 5, sectionTitle: "The Historian",       videoStyle: "AVATAR",      imageUrl: null, textContent: "This is the Language Server Protocol playbook. Whoever owns the dominant standard dictates the future roadmap." },
      { id: "b6", order: 6, sectionTitle: "Contradiction Map",   videoStyle: "WHITEBOARD",  imageUrl: null, textContent: "Security versus standardisation. Theory versus execution. Universal agreement: hard-coded API integration is obsolete. Blind spot: on-device compute." },
      { id: "b7", order: 7, sectionTitle: "The Synthesis",       videoStyle: "FACELESS",    imageUrl: null, textContent: "The resolving question: can MCP's governance be decentralised before vendor lock-in becomes structural? That is what you must now defend." },
    ],
  };

  const dims = TARGET_DIMENSIONS[defaultProps.target];
  const durationInFrames = TITLE_CARD_FRAMES + defaultProps.blocks.length * BLOCK_DURATION_FRAMES;

  return (
    <>
      <Composition
        id="ContentStormLecture"
        component={ContentStormLecture}
        durationInFrames={durationInFrames}
        fps={30}
        width={dims.width}
        height={dims.height}
        defaultProps={defaultProps}
        // The real inputProps come from renderMediaOnLambda — these are Studio defaults only.
        calculateMetadata={({ props }) => {
          const p    = props as LectureInputProps;
          const d    = TARGET_DIMENSIONS[p.target ?? "LMS_16_9"];
          const dur  = TITLE_CARD_FRAMES + (p.blocks?.length ?? 8) * BLOCK_DURATION_FRAMES;
          return { width: d.width, height: d.height, durationInFrames: dur };
        }}
      />
      <ContentStormClipComposition />
    </>
  );
}
