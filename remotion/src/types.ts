/**
 * Input props contract between the render worker and the Remotion compositions.
 * Must stay in sync with the worker's renderMediaOnLambda inputProps call.
 */

export type VideoStyle  = "AVATAR" | "WHITEBOARD" | "FACELESS";
export type RenderTarget = "LMS_16_9" | "MOBILE_9_16" | "SQUARE_1_1";

export interface BlockInput {
  id:          string;
  order:       number;
  sectionTitle: string;
  textContent: string;
  videoStyle:  VideoStyle;
  imageUrl:    string | null;
}

export interface LectureInputProps {
  moduleId:  string;
  title:     string;
  blocks:    BlockInput[];
  target:    RenderTarget;
  watermark: boolean;
}

// ── Derived constants ─────────────────────────────────────────────────────────

export const TARGET_DIMENSIONS: Record<RenderTarget, { width: number; height: number }> = {
  LMS_16_9:    { width: 1920, height: 1080 },
  MOBILE_9_16: { width: 1080, height: 1920 },
  SQUARE_1_1:  { width: 1080, height: 1080 },
};

/** Duration per block in frames at 30fps. */
export const BLOCK_DURATION_FRAMES = 300; // 10 seconds per block

/** Frames for title card at the start. */
export const TITLE_CARD_FRAMES = 90; // 3 seconds

/** Ken Burns zoom over the full block duration. */
export const KEN_BURNS_SCALE_FROM = 1.0;
export const KEN_BURNS_SCALE_TO   = 1.08;
