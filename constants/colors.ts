const ACCENT = "#C4622D";
const SAGE = "#7A9E7E";
const BLUE = "#5B8DB8";

export const Colors = {
  background: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F1EC",
  border: "#E8E0D5",
  accent: ACCENT,
  accentLight: "#F5E8DF",
  sage: SAGE,
  sageLight: "#E6F0E7",
  blue: BLUE,
  blueLight: "#E3EEF7",
  textPrimary: "#2C2517",
  textSecondary: "#8B7355",
  textMuted: "#B8A898",
  tagBg: "#EDE7DE",
  tagText: "#6B5A45",
  timerBorder: SAGE,
  noteBorder: ACCENT,
  photoBorder: BLUE,
  star: "#E8A838",
  danger: "#D93B3B",
  white: "#FFFFFF",
};

export default {
  light: {
    text: Colors.textPrimary,
    background: Colors.background,
    tint: Colors.accent,
    tabIconDefault: Colors.textMuted,
    tabIconSelected: Colors.accent,
  },
};
