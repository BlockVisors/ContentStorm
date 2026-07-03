import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";

/**
 * Shared Remotion components + design tokens.
 * All compositions import from here to maintain the Brutalist Sovereign aesthetic.
 */

// ── Design tokens (must match the web UI exactly) ────────────────────────────
export const C = {
  ink:        "#07100F",
  panel:      "#0C1B1A",
  tealBright: "#2E6F6A",
  lace:       "#ECE6D4",
  laceDim:    "#9FB0AC",
  laceFaint:  "#5E7370",
  gold:       "#C9A24B",
  rust:       "#B5563A",
} as const;

// Google Fonts are loaded via Remotion's font API in index.ts.
// These match the web app's type stack.
export const FONT = {
  display: "'Space Grotesk', system-ui, sans-serif",
  serif:   "'Spectral', Georgia, serif",
  mono:    "'IBM Plex Mono', ui-monospace, monospace",
} as const;

// ── Ken Burns pan ─────────────────────────────────────────────────────────────
/** Slowly zooms from scaleFrom to scaleTo over the clip duration. */
export function KenBurns({
  src,
  scaleFrom = 1.0,
  scaleTo   = 1.08,
  style,
}: {
  src:       string;
  scaleFrom?: number;
  scaleTo?:   number;
  style?:    React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [scaleFrom, scaleTo], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", ...style }}>
      <img
        src={src}
        style={{
          width:      "100%",
          height:     "100%",
          objectFit:  "cover",
          transform:  `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}

// ── Fade-in wrapper ───────────────────────────────────────────────────────────
export function FadeIn({
  children,
  durationFrames = 15,
  style,
}: {
  children:      React.ReactNode;
  durationFrames?: number;
  style?:        React.CSSProperties;
}) {
  const frame   = useCurrentFrame();
  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity, ...style }}>{children}</div>;
}

// ── Kinetic text block ────────────────────────────────────────────────────────
/**
 * Animated section title + body text. Text appears word-by-word with a
 * stagger of 3 frames per word — the core "kinetic typography" mechanic.
 */
export function KineticText({
  title,
  body,
  width,
  align = "left",
}: {
  title: string;
  body:  string;
  width: number;
  align?: "left" | "center";
}) {
  const frame = useCurrentFrame();
  const words = body.split(" ");

  // Each word fades in 3 frames after the previous.
  const visibleWords = words
    .map((w, i) => ({ w, visible: frame >= 20 + i * 3 }))
    .filter((x) => x.visible)
    .map((x) => x.w);

  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleY       = interpolate(frame, [0, 12], [10, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width,
        padding: "0 60px",
        textAlign: align,
        position:  "absolute",
        bottom:    80,
        left:      0,
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontFamily:    FONT.mono,
          fontSize:      20,
          fontWeight:    600,
          letterSpacing: "0.22em",
          color:         C.gold,
          textTransform: "uppercase",
          marginBottom:  16,
          opacity:       titleOpacity,
          transform:     `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {/* Body text — kinetic stagger */}
      <div
        style={{
          fontFamily:  FONT.serif,
          fontSize:    36,
          lineHeight:  1.45,
          color:       C.lace,
          fontWeight:  400,
        }}
      >
        {visibleWords.join(" ")}
        {visibleWords.length < words.length && (
          <span style={{ opacity: 0.3 }}>{" " + words.slice(visibleWords.length).join(" ")}</span>
        )}
      </div>
    </div>
  );
}

// ── Persona badge ─────────────────────────────────────────────────────────────
const PERSONA_COLORS: Record<string, string> = {
  PRACTITIONER: C.tealBright,
  ACADEMIC:     C.laceDim,
  SKEPTIC:      C.rust,
  ECONOMIST:    C.gold,
  HISTORIAN:    C.laceFaint,
};

export function PersonaBadge({ persona }: { persona: string }) {
  const color  = PERSONA_COLORS[persona] ?? C.laceDim;
  const sigils: Record<string, string> = {
    PRACTITIONER: "P", ACADEMIC: "A", SKEPTIC: "S", ECONOMIST: "E", HISTORIAN: "H",
  };
  return (
    <div
      style={{
        position:      "absolute",
        top:           48,
        left:          60,
        display:       "flex",
        alignItems:    "center",
        gap:           12,
      }}
    >
      <div
        style={{
          width:           36,
          height:          36,
          background:      color,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          fontFamily:      FONT.mono,
          fontSize:        16,
          fontWeight:      700,
          color:           C.ink,
        }}
      >
        {sigils[persona] ?? "?"}
      </div>
      <span
        style={{
          fontFamily:    FONT.mono,
          fontSize:      14,
          letterSpacing: "0.22em",
          color,
          textTransform: "uppercase",
        }}
      >
        {persona}
      </span>
    </div>
  );
}

// ── Rule line ─────────────────────────────────────────────────────────────────
/** Animated horizontal rule that draws left-to-right over `durationFrames`. */
export function AnimatedRule({
  color         = C.tealBright,
  durationFrames = 20,
  top,
  left = 60,
  width,
}: {
  color?:         string;
  durationFrames?: number;
  top:            number;
  left?:          number;
  width:          number;
}) {
  const frame = useCurrentFrame();
  const w     = interpolate(frame, [0, durationFrames], [0, width - left * 2], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position:  "absolute",
        top,
        left,
        height:    1,
        width:     w,
        background: color,
      }}
    />
  );
}

// ── Watermark ─────────────────────────────────────────────────────────────────
/** Fixed brutalist stamp in the bottom-right corner. Always 60% opacity. */
export function Watermark({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        position:      "absolute",
        bottom:        24,
        right:         32,
        fontFamily:    FONT.mono,
        fontSize:      13,
        letterSpacing: "0.18em",
        color:         C.lace,
        opacity:       0.6,
        textTransform: "uppercase",
        background:    "rgba(7,16,15,0.7)",
        padding:       "4px 10px",
        userSelect:    "none",
      }}
    >
      SYNTHESIZED VIA CONTENT STORM
    </div>
  );
}

// ── Title card ────────────────────────────────────────────────────────────────
export function TitleCard({
  title,
  width,
  height,
}: {
  title:  string;
  width:  number;
  height: number;
}) {
  const frame      = useCurrentFrame();
  const titleScale = interpolate(frame, [0, 30], [0.95, 1], { extrapolateRight: "clamp" });
  const opacity    = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width,
        height,
        background:  C.ink,
        display:     "flex",
        flexDirection: "column",
        alignItems:  "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          width:  width * 0.7,
          transform: `scale(${titleScale})`,
        }}
      >
        <div style={{ fontFamily: FONT.mono, fontSize: 16, letterSpacing: "0.3em", color: C.gold, textTransform: "uppercase", marginBottom: 24 }}>
          CONTENT STORM · MODULE
        </div>
        <div style={{ width: "100%", height: 1, background: C.tealBright, marginBottom: 32 }} />
        <div style={{ fontFamily: FONT.display, fontSize: Math.min(72, width * 0.06), lineHeight: 1.05, color: C.lace, fontWeight: 700 }}>
          {title}
        </div>
        <div style={{ width: "100%", height: 1, background: C.tealBright, marginTop: 32 }} />
      </div>
    </div>
  );
}
