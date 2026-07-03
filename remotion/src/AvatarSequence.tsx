import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
  useVideoConfig,
} from "remotion";
import type { BlockInput, LectureInputProps } from "./types";
import {
  C, FONT,
  KineticText, PersonaBadge, AnimatedRule, Watermark, TitleCard, FadeIn,
} from "./components";
import { BLOCK_DURATION_FRAMES, TITLE_CARD_FRAMES } from "./types";

/**
 * AvatarSequence — Blueprint §10.
 *
 * "Expert Panel" format: each persona block renders as a split-screen.
 *   Left  (40%) — the persona image / avatar placeholder with a colour-coded
 *                 left border that matches the persona's accent colour.
 *   Right (60%) — the kinetic argument text on a near-black panel.
 *
 * In production, the left panel image would be replaced with a real HeyGen
 * API talking-head video clip for the Avatar modality. The composition
 * accepts imageUrl as the visual source — when the real avatar video URL
 * is available it replaces the still image seamlessly.
 *
 * Non-AVATAR blocks (INTRO, SYNTHESIS) in a forced-AVATAR track fall
 * through to the faceless layout (full-bleed with text overlay).
 */

const PERSONA_ACCENT: Record<string, string> = {
  PRACTITIONER: C.tealBright,
  ACADEMIC:     C.laceDim,
  SKEPTIC:      C.rust,
  ECONOMIST:    C.gold,
  HISTORIAN:    C.laceFaint,
};

function extractPersona(title: string): string {
  const up = title.toUpperCase();
  for (const p of Object.keys(PERSONA_ACCENT)) {
    if (up.includes(p)) return p;
  }
  return "";
}

function AvatarClip({
  block,
  width,
  height,
}: {
  block:  BlockInput;
  width:  number;
  height: number;
}) {
  const frame   = useCurrentFrame();
  const persona = extractPersona(block.sectionTitle);
  const accent  = PERSONA_ACCENT[persona] ?? C.tealBright;

  const opacity = interpolate(
    frame,
    [0, 8, BLOCK_DURATION_FRAMES - 8, BLOCK_DURATION_FRAMES],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // Non-persona blocks: full-bleed faceless layout.
  if (!persona) {
    return (
      <AbsoluteFill style={{ opacity, background: C.ink }}>
        {block.imageUrl && (
          <AbsoluteFill>
            <img src={block.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <AbsoluteFill style={{ background: "rgba(7,16,15,0.7)" }} />
          </AbsoluteFill>
        )}
        <KineticText title={block.sectionTitle} body={block.textContent.slice(0, 300)} width={width} />
      </AbsoluteFill>
    );
  }

  const leftW  = Math.round(width * 0.4);
  const rightW = width - leftW;

  // Slide-in for the right panel text column.
  const panelX = interpolate(frame, [0, 20], [rightW * 0.06, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <AbsoluteFill style={{ opacity, flexDirection: "row", display: "flex" }}>
      {/* Left — avatar / image panel */}
      <div style={{ width: leftW, height, position: "relative", overflow: "hidden" }}>
        {/* Accent left border */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: accent, zIndex: 2 }} />

        {block.imageUrl ? (
          <img
            src={block.imageUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: C.panel, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 700, color: accent }}>
              {persona[0]}
            </span>
          </div>
        )}

        {/* Persona badge over image */}
        <PersonaBadge persona={persona} />

        {/* Right-edge fade into the text panel */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
          background: `linear-gradient(to right, transparent, ${C.ink})` }} />
      </div>

      {/* Right — argument text panel */}
      <div
        style={{
          width:       rightW,
          height,
          background:  C.ink,
          position:    "relative",
          transform:   `translateX(${panelX}px)`,
          display:     "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding:     "0 60px 80px 48px",
        }}
      >
        <AnimatedRule top={height - 200} left={48} width={rightW} durationFrames={18} />

        <FadeIn durationFrames={18}>
          <div style={{ fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.22em", color: accent, textTransform: "uppercase", marginBottom: 16 }}>
            {block.sectionTitle}
          </div>
          <div style={{ fontFamily: FONT.serif, fontSize: 32, lineHeight: 1.5, color: C.lace }}>
            {block.textContent.slice(0, 280)}
            {block.textContent.length > 280 && (
              <span style={{ opacity: 0.35 }}>…</span>
            )}
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

export function AvatarSequence({ props }: { props: LectureInputProps }) {
  const { width, height } = useVideoConfig();
  let offset = TITLE_CARD_FRAMES;

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence from={0} durationInFrames={TITLE_CARD_FRAMES}>
        <TitleCard title={props.title} width={width} height={height} />
      </Sequence>

      {props.blocks.map((block) => {
        const from = offset;
        offset += BLOCK_DURATION_FRAMES;
        return (
          <Sequence key={block.id} from={from} durationInFrames={BLOCK_DURATION_FRAMES}>
            <AvatarClip block={block} width={width} height={height} />
          </Sequence>
        );
      })}

      {props.watermark && <Watermark width={width} height={height} />}
    </AbsoluteFill>
  );
}
