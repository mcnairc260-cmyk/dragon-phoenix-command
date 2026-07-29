---
name: Opportunity Radar
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed01b'
  on-secondary-container: '#6f5900'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The brand personality is authoritative yet forward-thinking, positioning itself as a high-trust intelligence layer for business decision-makers. It balances the "Deep Professional Blue" of established finance with the "Vibrant Star Gold" of emerging potential.

The design style is **Corporate / Modern** with a strong emphasis on **Minimalism**. It prioritizes information density without sacrificing clarity, utilizing expansive whitespace to prevent cognitive overload in data-heavy views. The emotional response should be one of "calm clarity"—the user should feel they are seeing through the noise of the market into actionable insights.

## Colors
The palette is anchored by **Deep Professional Blue** (#0F172A), used for navigation, primary actions, and high-level headings to establish authority. **Vibrant Star Gold** (#FACC15) is used sparingly as a high-contrast accent to highlight "Opportunities" or "Signals"—it should never be used for large surfaces.

**Fresh Emerald** (#10B981) serves as a functional semantic color indicating growth, positive trends, and "Emerging" status. The background environment uses **Cool Gray** (#F8FAFC) to create a soft, non-distracting canvas, while **Slate** (#334155) provides high-legibility body text that is softer than pure black.

## Typography
This design system utilizes **Inter** exclusively to ensure a systematic, utilitarian aesthetic that remains highly readable at small sizes. 

Headlines use a bold weight with slightly tightened letter-spacing to appear more "designed" and authoritative. For data visualization and labels, the `label-md` style uses an uppercase treatment to create a clear visual distinction from narrative text. Paragraph text stays strictly at 16px or 18px to ensure the professional audience can scan long-form reports without eye strain.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop, centered within a 1280px container to maintain line-length readability for data tables and reports. It utilizes a 12-column structure.

On mobile devices, the layout transitions to a single-column fluid flow with 16px side margins. Horizontal scrolling "shelves" are preferred for data cards on mobile to keep the vertical scan-line clean. Vertical rhythm is strictly enforced using a 4px baseline grid, with 16px (`stack-md`) being the default gap between related elements.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Ambient Shadows**. The primary background is the lightest neutral, while interactive cards sit on a pure white surface.

Shadows must be "Professional"—meaning they are extremely subtle, using a large blur radius with very low opacity (e.g., `box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05)`). This creates a sense of the interface "floating" slightly above the data canvas. Active or hovered elements may increase this shadow depth slightly to provide tactile feedback. Borders should be kept to a minimum, used only when tonal separation is insufficient.

## Shapes
The design system adopts a **Rounded** (Level 2) shape language. Standard components like input fields and buttons use an 8px (`0.5rem`) radius. 

Large containers and cards use the `rounded-lg` (16px) or `rounded-xl` (24px) tokens to soften the "data-heavy" nature of the product, making the AI-driven insights feel more approachable and modern. Circular radii are reserved exclusively for avatars and icon containers within "Opportunity" chips.

## Components

### Buttons
- **Primary:** Solid Deep Blue (#0F172A) with white text. 8px rounded corners.
- **Secondary:** Outlined Slate (#334155) with a 1px border.
- **Action/Opportunity:** Solid Gold (#FACC15) with Deep Blue text—reserved for the "Invest" or "Explore" primary CTA.

### Cards
Cards are the primary container for "Opportunities." They feature a white background, 16px corner radius, and a subtle ambient shadow. A 2px top-border in Star Gold or Fresh Emerald can be used to categorize the card's content type.

### Chips & Tags
Used for "Emerging" or "Hot" indicators. They should be semi-transparent versions of the semantic colors (e.g., Emerald at 10% opacity) with high-contrast text. Use `label-md` typography.

### Input Fields
Clean, 8px rounded borders using a light slate stroke. Focus states should transition the border to Deep Blue with a soft 2px outer glow.

### Radar Visualization
Custom component using concentric circles in light gray with animated "pulse" points in Star Gold to represent new data points being discovered by the AI.