import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  useVideoConfig,
  Easing,
} from "remotion";
import type { BlockInput, LectureInputProps } from "./types";
import {
  C, FONT,
  Watermark, TitleCard, AnimatedRule, FadeIn,
} from "./components";
import { BLOCK_DURATION_FRAMES, TITLE_CARD_FRAMES } from "./types";

/**
 * WhiteboardSequence — Blueprint §10.
 *
 * "Contradiction Map" format. No external images — this is a pure
 * programmatic SVG composition that animates the structural friction:
 *
 *   Phase 1 (frames 0–60):   Five persona nodes draw in from the centre.
 *   Phase 2 (frames 60–160): Connecting lines draw between clashing pairs.
 *   Phase 3 (frames 160–240): Text labels fade in (persona names, clash descriptions).
 *   Phase 4 (frames 240–300): The resolving question appears at the bottom.
 *
 * Non-WHITEBOARD blocks in a forced-WHITEBOARD track render as clean
 * text-on-dark panels (no SVG graph).
 */

// ── Persona node positions (polar, relative to centre) ────────────────────────
const PERSONA_NODES = [
  { id: "PRACTITIONER", angle: -90,  color: C.tealBright, sigil: "P" },
  { id: "ACADEMIC",     angle: -18,  color: C.laceDim,    sigil: "A" },
  { id: "SKEPTIC",      angle:  54,  color: C.rust,       sigil: "S" },
  { id: "ECONOMIST",    angle: 126,  color: C.gold,       sigil: "E" },
  { id: "HISTORIAN",    angle: 198,  color: C.laceFaint,  sigil: "H" },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function WhiteboardClip({
  block,
  width,
  height,
}: {
  block:  BlockInput;
  width:  number;
  height: number;
}) {
  const frame   = useCurrentFrame();
  const cx      = width  / 2;
  const cy      = height / 2 - 40;
  const nodeR   = Math.min(width, height) * 0.33;
  const circleR = 28;

  // Phase gates.
  const nodesIn  = interpolate(frame, [0, 60],     [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.elastic(0.9)) });
  const linesIn  = interpolate(frame, [60, 160],   [0, 1], { extrapolateRight: "clamp" });
  const labelsIn = interpolate(frame, [160, 200],  [0, 1], { extrapolateRight: "clamp" });
  const questionIn = interpolate(frame, [240, 270],[0, 1], { extrapolateRight: "clamp" });

  const overallOpacity = interpolate(
    frame,
    [0, 10, BLOCK_DURATION_FRAMES - 10, BLOCK_DURATION_FRAMES],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Extract text from block — the WhiteboardSequence is always the Contradiction block.
  const text     = block.textContent.slice(0, 260);
  const question = block.textContent.slice(0, 180);

  return (
    <AbsoluteFill style={{ background: C.ink, opacity: overallOpacity }}>
      {/* Section label */}
      <div style={{ position: "absolute", top: 36, left: 60, fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.3em", color: C.gold, textTransform: "uppercase" }}>
        CONTRADICTION MAP
      </div>

      {/* SVG graph */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Connection lines between all pairs */}
        {PERSONA_NODES.map((a, i) =>
          PERSONA_NODES.slice(i + 1).map((b) => {
            const posA = polar(cx, cy, nodeR, a.angle);
            const posB = polar(cx, cy, nodeR, b.angle);
            const lineOpacity = linesIn * 0.28;
            return (
              <line
                key={`${a.id}-${b.id}`}
                x1={posA.x} y1={posA.y}
                x2={posB.x} y2={posB.y}
                stroke={C.tealBright}
                strokeWidth={1.2}
                opacity={lineOpacity}
              />
            );
          })
        )}

        {/* Clash highlight lines — slightly brighter, animated */}
        {PERSONA_NODES.slice(0, -1).map((a, i) => {
          const b    = PERSONA_NODES[i + 1];
          const posA = polar(cx, cy, nodeR, a.angle);
          const posB = polar(cx, cy, nodeR, b.angle);
          const lw   = interpolate(frame, [60, 120], [0, 2], { extrapolateRight: "clamp" });
          return (
            <line
              key={`clash-${a.id}`}
              x1={posA.x} y1={posA.y}
              x2={posB.x} y2={posB.y}
              stroke={C.rust}
              strokeWidth={lw}
              opacity={linesIn * 0.7}
              strokeDasharray="6 4"
            />
          );
        })}

        {/* Persona nodes */}
        {PERSONA_NODES.map((node) => {
          const pos   = polar(cx, cy, nodeR, node.angle);
          const scale = nodesIn;
          return (
            <g key={node.id} transform={`translate(${pos.x},${pos.y}) scale(${scale})`}>
              <circle r={circleR} fill={node.color} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={C.ink}
                fontSize={16}
                fontWeight={700}
                fontFamily={FONT.mono}
              >
                {node.sigil}
              </text>
            </g>
          );
        })}

        {/* Central node — the field blind spot dot */}
        <circle
          cx={cx}
          cy={cy}
          r={interpolate(frame, [80, 120], [0, 10], { extrapolateRight: "clamp" })}
          fill={C.gold}
          opacity={linesIn}
        />

        {/* Persona labels (outside nodes) */}
        {PERSONA_NODES.map((node) => {
          const labelR = nodeR + circleR + 20;
          const pos    = polar(cx, cy, labelR, node.angle);
          return (
            <text
              key={`label-${node.id}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={node.color}
              fontSize={12}
              fontFamily={FONT.mono}
              letterSpacing="2"
              opacity={labelsIn}
            >
              {node.id}
            </text>
          );
        })}
      </svg>

      {/* Resolving question */}
      <div
        style={{
          position:    "absolute",
          bottom:      60,
          left:        60,
          right:       60,
          opacity:     questionIn,
          textAlign:   "center",
        }}
      >
        <AnimatedRule top={0} left={0} width={width - 120} color={C.gold} durationFrames={20} />
        <div style={{ marginTop: 20, fontFamily: FONT.mono, fontSize: 12, letterSpacing: "0.2em", color: C.gold, marginBottom: 12 }}>
          THE RESOLVING QUESTION
        </div>
        <div style={{ fontFamily: FONT.serif, fontSize: 28, lineHeight: 1.5, color: C.lace }}>
          {question}
        </div>
      </div>

      {/* Block text in upper-right if it's a non-map block */}
      {block.videoStyle !== "WHITEBOARD" && (
        <div style={{ position: "absolute", top: 80, right: 60, width: width * 0.35, fontFamily: FONT.serif, fontSize: 20, color: C.laceDim, lineHeight: 1.6, opacity: labelsIn }}>
          {text}
        </div>
      )}
    </AbsoluteFill>
  );
}

function TextClip({ block, width, height }: { block: BlockInput; width: number; height: number }) {
  const frame   = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, BLOCK_DURATION_FRAMES - 10, BLOCK_DURATION_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.ink, opacity, justifyContent: "flex-end", padding: "0 80px 80px" }}>
      <AnimatedRule top={height - 180} left={80} width={width - 160} />
      <FadeIn durationFrames={20}>
        <div style={{ fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.22em", color: C.gold, textTransform: "uppercase", marginBottom: 16 }}>{block.sectionTitle}</div>
        <div style={{ fontFamily: FONT.serif, fontSize: 34, lineHeight: 1.5, color: C.lace }}>{block.textContent.slice(0, 280)}</div>
      </FadeIn>
    </AbsoluteFill>
  );
}

export function WhiteboardSequence({ props }: { props: LectureInputProps }) {
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
            {block.videoStyle === "WHITEBOARD"
              ? <WhiteboardClip block={block} width={width} height={height} />
              : <TextClip block={block} width={width} height={height} />
            }
          </Sequence>
        );
      })}

      {props.watermark && <Watermark width={width} height={height} />}
    </AbsoluteFill>
  );
}
