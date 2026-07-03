import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import type { ClipInputProps } from "./types";
import { CLIP_BEAT_FRAMES, CLIP_CTA_FRAMES } from "./types";
import { C, FONT, KenBurns, Watermark, AnimatedRule } from "./components";

/**
 * ClipperSequence — The Arbitrage Clipper (V2-10).
 *
 * Three platform-mode visual strategies, matching The_arbitrage_clipper.md §1:
 *
 *   RETAINER   (1 beat,   ~22s) — single continuous scene, oversized kinetic
 *              type, aggressive pacing. No scene breaks by design — a cut
 *              here would undercut the "single thesis, direct counter" format.
 *   EDUCATOR   (3 beats,  ~48s) — 3 dynamic scenes + a closing CTA card.
 *   DEEP_DIVER (8-15 beats, 96-180s) — the "retention reset" patent claim:
 *              a visual accent flips at every beat boundary (alternating
 *              accent color + a directional wipe) so a scroller's eye catches
 *              a change every 12s, matching the source spec's 10-15s cadence.
 *
 * Text is oversized relative to FacelessSequence's lecture treatment — this
 * is a 1080-wide vertical frame meant to be watched at arm's length in a
 * feed, not a 1920-wide lecture; "aggressive kinetic typography" (the
 * source spec's own words for Retainer) called for a bespoke, punchier
 * treatment rather than reusing components.tsx's KineticText as-is.
 */

const WORD_FRAME_STEP: Record<ClipInputProps["platformMode"], number> = {
  RETAINER: 2,   // fastest reveal — matches "aggressive" pacing
  EDUCATOR: 3,
  DEEP_DIVER: 3,
};

function ClipKineticText({
  text,
  width,
  height,
  accentColor,
  fontScale = 1,
}: {
  text: string;
  width: number;
  height: number;
  accentColor: string;
  fontScale?: number;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const step  = 2;

  const visibleWords = words
    .map((w, i) => ({ w, visible: frame >= 10 + i * step }))
    .filter((x) => x.visible)
    .map((x) => x.w);

  const barWidth = interpolate(frame, [0, 14], [0, width * 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: height * 0.16,
        padding: "0 56px",
      }}
    >
      {/* Accent bar — the "aggressive" signature element */}
      <div style={{ width: barWidth, height: 6, background: accentColor, marginBottom: 28 }} />

      <div
        style={{
          fontFamily: FONT.display,
          fontWeight: 700,
          fontSize: Math.round(58 * fontScale),
          lineHeight: 1.08,
          letterSpacing: "-0.01em",
          color: C.lace,
          textShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      >
        {visibleWords.join(" ")}
        {visibleWords.length < words.length && (
          <span style={{ opacity: 0.25 }}>{" " + words.slice(visibleWords.length).join(" ")}</span>
        )}
      </div>
    </div>
  );
}

function ClipBackground({
  sourceImageUrl,
  width,
  height,
}: {
  sourceImageUrl: string | null;
  width: number;
  height: number;
}) {
  return (
    <AbsoluteFill>
      {sourceImageUrl ? (
        <KenBurns src={sourceImageUrl} scaleFrom={1.0} scaleTo={1.12} />
      ) : (
        <div style={{ width, height, background: C.panel }} />
      )}
      {/* Heavier vignette than the lecture format — vertical shorts read at
          a glance, text needs to win against a busier background instantly. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to top,
            rgba(7,16,15,0.96) 0%,
            rgba(7,16,15,0.75) 30%,
            rgba(7,16,15,0.15) 60%,
            transparent 80%
          )`,
        }}
      />
    </AbsoluteFill>
  );
}

/** DEEP_DIVER's retention-reset wipe — a thin directional bar sweeps across
 *  the top edge at the start of every beat, cueing a visual "reset" without
 *  requiring a fresh asset per beat. */
function RetentionResetWipe({ width, accentColor }: { width: number; accentColor: string }) {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 16], [-width * 0.3, width], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: x,
        width: width * 0.3,
        height: 10,
        background: accentColor,
        opacity: interpolate(frame, [0, 4, 14, 18], [0, 1, 1, 0], { extrapolateRight: "clamp" }),
      }}
    />
  );
}

function BeatScene({
  beatText,
  index,
  props,
  width,
  height,
}: {
  beatText: string;
  index: number;
  props: ClipInputProps;
  width: number;
  height: number;
}) {
  const frame = useCurrentFrame();
  const durationFrames = CLIP_BEAT_FRAMES[props.platformMode];

  const opacity = interpolate(
    frame,
    [0, 8, durationFrames - 8, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.ease }
  );

  // Alternating accent per beat — the visible half of the "retention reset."
  const accent = index % 2 === 0 ? C.gold : C.tealBright;
  const isRetainer = props.platformMode === "RETAINER";

  return (
    <AbsoluteFill style={{ opacity }}>
      <ClipBackground sourceImageUrl={props.sourceImageUrl} width={width} height={height} />

      {props.platformMode === "DEEP_DIVER" && (
        <RetentionResetWipe width={width} accentColor={accent} />
      )}

      <AnimatedRule top={height * 0.08} left={56} width={width} color={accent} durationFrames={16} />

      <ClipKineticText
        text={beatText}
        width={width}
        height={height}
        accentColor={accent}
        fontScale={isRetainer ? 1.15 : 1}
      />
    </AbsoluteFill>
  );
}

function CTACard({ ctaText, width, height }: { ctaText: string; width: number; height: number }) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 14], [0.92, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ width: width * 0.8, transform: `scale(${scale})`, textAlign: "center" }}>
        <div style={{ width: "100%", height: 2, background: C.gold, marginBottom: 32 }} />
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.15,
            color: C.gold,
            textTransform: "uppercase",
          }}
        >
          {ctaText}
        </div>
        <div style={{ width: "100%", height: 2, background: C.gold, marginTop: 32 }} />
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 14,
            letterSpacing: "0.3em",
            color: C.laceDim,
            marginTop: 24,
            textTransform: "uppercase",
          }}
        >
          CONTENT STORM
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function ClipperSequence({ props }: { props: ClipInputProps }) {
  const { width, height } = useVideoConfig();
  let offset = 0;
  const beatFrames = CLIP_BEAT_FRAMES[props.platformMode];

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {props.beats.map((beatText, i) => {
        const from = offset;
        offset += beatFrames;
        return (
          <Sequence key={i} from={from} durationInFrames={beatFrames}>
            <BeatScene beatText={beatText} index={i} props={props} width={width} height={height} />
          </Sequence>
        );
      })}

      {props.ctaText && (
        <Sequence from={offset} durationInFrames={CLIP_CTA_FRAMES}>
          <CTACard ctaText={props.ctaText} width={width} height={height} />
        </Sequence>
      )}

      {props.watermark && <Watermark width={width} height={height} />}
    </AbsoluteFill>
  );
}

/** Total duration for this clip's inputProps — used by calculateMetadata in index.ts. */
export function clipDurationInFrames(props: Pick<ClipInputProps, "platformMode" | "beats" | "ctaText">): number {
  const beatFrames = CLIP_BEAT_FRAMES[props.platformMode];
  const beatsTotal = (props.beats?.length ?? 1) * beatFrames;
  return beatsTotal + (props.ctaText ? CLIP_CTA_FRAMES : 0);
}
