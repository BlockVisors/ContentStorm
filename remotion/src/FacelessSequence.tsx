import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import type { BlockInput, LectureInputProps } from "./types";
import {
  C, FONT,
  KenBurns, KineticText, PersonaBadge, AnimatedRule, Watermark, TitleCard,
} from "./components";
import { BLOCK_DURATION_FRAMES, TITLE_CARD_FRAMES } from "./types";

/**
 * FacelessSequence — Blueprint §10.
 *
 * Each block:
 *   - Full-bleed generated image with a slow Ken Burns zoom.
 *   - Dark teal vignette gradient at the bottom third.
 *   - Section title (monospace, gold) + body text (Spectral serif)
 *     staggered word-by-word from bottom-left.
 *   - Persona badge in the top-left for AVATAR-type blocks embedded in
 *     an otherwise faceless track (shouldn't happen in auto-match, but safe).
 *   - Animated rule draws across the screen at frame 0.
 *
 * Fallback: if imageUrl is null (image not yet generated), renders a
 * full-bleed dark teal panel with the text only — never a broken frame.
 */

function BlockClip({ block, width, height }: { block: BlockInput; width: number; height: number }) {
  const frame = useCurrentFrame();

  // Fade in / out at clip boundaries.
  const opacity = interpolate(
    frame,
    [0, 8, BLOCK_DURATION_FRAMES - 8, BLOCK_DURATION_FRAMES],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background — image or fallback panel */}
      <AbsoluteFill>
        {block.imageUrl ? (
          <KenBurns src={block.imageUrl} scaleFrom={1.0} scaleTo={1.08} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: C.panel }} />
        )}
      </AbsoluteFill>

      {/* Bottom vignette gradient */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to top,
            rgba(7,16,15,0.92) 0%,
            rgba(7,16,15,0.6)  35%,
            transparent        65%
          )`,
        }}
      />

      {/* Rule line */}
      <AnimatedRule top={height - 180} width={width} durationFrames={18} />

      {/* Persona badge (only for AVATAR-style blocks) */}
      {block.videoStyle === "AVATAR" && (
        <PersonaBadge persona={extractPersona(block.sectionTitle)} />
      )}

      {/* Kinetic text */}
      <KineticText
        title={block.sectionTitle}
        body={block.textContent.slice(0, 300)}
        width={width}
      />
    </AbsoluteFill>
  );
}

function extractPersona(title: string): string {
  const up = title.toUpperCase();
  for (const p of ["PRACTITIONER", "ACADEMIC", "SKEPTIC", "ECONOMIST", "HISTORIAN"]) {
    if (up.includes(p)) return p;
  }
  return "SYNTHESIS";
}

export function FacelessSequence({ props }: { props: LectureInputProps }) {
  const { width, height } = useVideoConfig();
  let offset = TITLE_CARD_FRAMES;

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Title card */}
      <Sequence from={0} durationInFrames={TITLE_CARD_FRAMES}>
        <TitleCard title={props.title} width={width} height={height} />
      </Sequence>

      {/* Block clips */}
      {props.blocks.map((block) => {
        const from = offset;
        offset += BLOCK_DURATION_FRAMES;
        return (
          <Sequence key={block.id} from={from} durationInFrames={BLOCK_DURATION_FRAMES}>
            <BlockClip block={block} width={width} height={height} />
          </Sequence>
        );
      })}

      {/* Watermark overlay — always on top */}
      {props.watermark && <Watermark width={width} height={height} />}
    </AbsoluteFill>
  );
}
