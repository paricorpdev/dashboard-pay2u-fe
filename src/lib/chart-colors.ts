/** Shared palette for charts & category accents. */
export const CHART_COLORS = {
  primary: "#6366f1",
  accent: "#22d3ee",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  violet: "#a78bfa",
  pink: "#f472b6",
  orange: "#fb923c",
  teal: "#2dd4bf",
  lime: "#a3e635",
} as const;

/** Ordered palette used for pie/donut slices. */
export const SERIES_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.accent,
  CHART_COLORS.violet,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.pink,
  CHART_COLORS.orange,
  CHART_COLORS.teal,
  CHART_COLORS.lime,
  CHART_COLORS.danger,
];

export const AXIS_COLOR = "#64748b";
export const GRID_COLOR = "#e3e8f0";

/** Fixed colors for the two headline categories. */
export const CATEGORY_COLOR: Record<string, string> = {
  VA: CHART_COLORS.primary,
  QRIS: CHART_COLORS.accent,
  Other: CHART_COLORS.warning,
};
