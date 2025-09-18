# LiquidGlass - Liquid Glass Component for React

[中文文档 / Chinese README](README.md)

A high-quality, customizable liquid glass effect component built with React, TypeScript, and SVG filters.

## Features

- **Pure Frontend**: Built with Canvas + SVG Filter, no external dependencies
- **Customizable**: Width, height, border radius, position, className and inline styles
- **Fluid Distortion**: Custom fragment logic generates displacement maps with soft edge feathering and "jelly" texture
- **Animation Support**: Includes `LiquidGlassAnimation` wrapper with X-axis translation and subtle jelly bounce effects

## Example

<img src="./src//assets/image.png" alt="Liquid glass component example" style="max-width: 600px; border-radius: 16px; box-shadow: 0 4px 24px #0001; margin-bottom: 16px;" />

## Quick Start

```tsx
// Use in any component, e.g. src/App.tsx
import React from "react";
import LiquidGlass, {
  LiquidGlassAnimation,
} from "./src/components/LiquidGlass";

export default function Demo() {
  return (
    <div
      style={{ height: "100vh", background: "#eceff1", position: "relative" }}
    >
      {/* Basic liquid glass card */}
      <LiquidGlass
        width={320}
        height={200}
        borderRadius={24}
        style={{ position: "absolute", top: 60, left: 40 }}
      />

      {/* Animated liquid glass card (X-axis translation) */}
      <LiquidGlassAnimation
        translateX={40}
        width={280}
        height={160}
        borderRadius={18}
        style={{ position: "absolute", top: 300, left: 40 }}
      />
    </div>
  );
}
```

> Note: Adjust the import path according to your project structure. If using Vite's `@` alias, use `@/components/LiquidGlass`.

## API (Props)

### LiquidGlass Component

- **width?**: number (default: 300)
- **height?**: number (default: 200)
- **borderRadius?**: number (default: 150) - Card border radius
- **className?**: string - Custom class name (can be used with `index.css` for customization)
- **style?**: React.CSSProperties - Inline styles (can override default `backdropFilter` etc.)
- **position?**: `{ x: number; y: number }` - Relative displacement (mapped to container's `top/left`)
- **onMouseDown? / onMouseMove? / onMouseUp?**: Event callbacks (useful for drag interactions)

### LiquidGlassAnimation Component

Additional props:

- **translateX?**: number (default: 0) - X-axis translation with subtle jelly animation

## Customization & Tuning

- **Glass Effect Intensity**: In the component's container `style.backdropFilter`, larger `blur(px)` values create more "glassy" effects. Default is very subtle (`blur(0.25px)`), recommend increasing to `4px ~ 12px` as needed.
- **Distortion Intensity**: Controlled by SVG `feDisplacementMap`'s `scale`. The component automatically estimates and sets this based on the displacement map. You can adjust the coefficient in the `updateDisplacementMap` function in `src/components/LiquidGlass/index.tsx` (search for "位移强度" comment).
- **Edge Feathering**: Controlled in the `fragment` callback via `smoothStep` and `roundedRectSDF`. Increasing threshold differences makes edges more "fuzzy".
- **Performance**: The component dynamically generates displacement maps based on `width/height`. For many instances, consider controlling dimensions or reusing parameters to avoid frequent recalculation.

## Browser Compatibility

- Requires `SVG feDisplacementMap` and `backdrop-filter` (or `filter: blur()`) effects: Supported in mainstream Chromium, Firefox, and Safari. Specific behavior may vary slightly between browsers.
- Mobile-friendly, but recommend testing on target devices for effect and performance.

## File Structure

- `src/components/LiquidGlass/index.tsx`: Component implementation and animation wrapper
- `src/components/LiquidGlass/index.css`: Styles (extend as needed)

For development, refer to the comments in `index.tsx` (core functions: `fragment`, `updateDisplacementMap`).

---

## Inspiration

This project is inspired by [shuding/liquid-glass](https://github.com/shuding/liquid-glass), with TypeScript refactoring, comment additions, and API extensions to better adapt to React and provide more user-friendly animation wrappers.  
For a deeper understanding of the principles or to explore more usage patterns, we recommend reading the original repository's source code and documentation.
