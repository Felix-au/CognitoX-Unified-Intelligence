export type ToolVariant =
  | "notes_tool"
  | "youtube_tool"
  | "diagram_tool";

export const TOOL_LABELS: Record<ToolVariant, string> = {
  notes_tool: "Smart Notes OCR",
  youtube_tool: "YouTube Media Analyzer",
  diagram_tool: "Interactive Diagram Studio",
};
