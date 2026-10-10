/**
 * styles/tailwind.config.js
 * Stitch Calm Design System Tokens for Tailwind CDN
 * Palette: Japandi Minimalist Mindful Brain Retreat
 */

tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-high": "#dcece4",
        "surface-container-low": "#e7f7f0",
        "surface-variant": "#d6e6df",
        "secondary-fixed": "#b8eedb",
        "error": "#ba1a1a",
        "inverse-on-surface": "#e4f4ed",
        "on-secondary-fixed-variant": "#1b4f42",
        "on-secondary-container": "#3b6d5f",
        "surface-tint": "#48645d",
        "outline-variant": "#c1c8c5",
        "outline": "#727976",
        "error-container": "#ffdad6",
        "tertiary-fixed": "#ffddae",
        "primary-fixed": "#cae9e0",
        "primary-fixed-dim": "#aecdc4",
        "on-error-container": "#93000a",
        "on-primary": "#ffffff",
        "on-tertiary-container": "#c2964f",
        "on-surface": "#101e1a",
        "secondary-fixed-dim": "#9dd1c0",
        "secondary-container": "#b8eedb",
        "on-tertiary": "#ffffff",
        "on-background": "#101e1a",
        "inverse-primary": "#aecdc4",
        "surface-container-highest": "#d6e6df",
        "surface-container-lowest": "#ffffff",
        "on-secondary-fixed": "#002019",
        "primary": "#06241f",
        "secondary": "#356759",
        "on-primary-container": "#86a49c",
        "surface-container": "#e1f2ea",
        "on-tertiary-fixed": "#281800",
        "inverse-surface": "#25332e",
        "on-surface-variant": "#414846",
        "surface-bright": "#edfdf5",
        "primary-container": "#1e3a34",
        "tertiary-container": "#493000",
        "tertiary-fixed-dim": "#efbf73",
        "on-secondary": "#ffffff",
        "on-tertiary-fixed-variant": "#604100",
        "surface-dim": "#ceded6",
        "tertiary": "#2d1c00",
        "on-primary-fixed": "#02201b",
        "background": "#edfdf5",
        "surface": "#edfdf5",
        "on-error": "#ffffff",
        "on-primary-fixed-variant": "#304c46"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "margin": "1.25rem",
        "margin-desktop": "3rem",
        "space-sm": "0.5rem",
        "space-xl": "2.25rem",
        "space-md": "1rem",
        "gutter": "1.25rem",
        "space-xs": "0.25rem",
        "space-2xl": "3.5rem",
        "gutter-tablet": "1.5rem",
        "space-lg": "1.5rem",
        "margin-tablet": "2rem",
        "gutter-desktop": "2rem"
      },
      fontFamily: {
        "body-xl": ["Inter"],
        "headline-xl": ["Plus Jakarta Sans"],
        "label-md": ["Inter"],
        "display-lg-mobile": ["Plus Jakarta Sans"],
        "label-lg": ["Inter"],
        "body-md": ["Inter"],
        "label-sm": ["Inter"],
        "headline-md": ["Plus Jakarta Sans"],
        "body-lg": ["Inter"],
        "headline-lg": ["Plus Jakarta Sans"],
        "display-lg": ["Plus Jakarta Sans"]
      },
      fontSize: {
        "body-xl": ["20px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "400" }],
        "headline-xl": ["28px", { "lineHeight": "38px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "500" }],
        "display-lg-mobile": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "label-lg": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500" }],
        "body-md": ["14px", { "lineHeight": "22px", "letterSpacing": "0em", "fontWeight": "400" }],
        "label-sm": ["11px", { "lineHeight": "14px", "letterSpacing": "0.04em", "fontWeight": "600" }],
        "headline-md": ["18px", { "lineHeight": "26px", "letterSpacing": "0em", "fontWeight": "600" }],
        "body-lg": ["16px", { "lineHeight": "26px", "letterSpacing": "-0.005em", "fontWeight": "400" }],
        "headline-lg": ["22px", { "lineHeight": "30px", "letterSpacing": "-0.005em", "fontWeight": "600" }],
        "display-lg": ["40px", { "lineHeight": "52px", "letterSpacing": "-0.02em", "fontWeight": "600" }]
      }
    }
  }
};
