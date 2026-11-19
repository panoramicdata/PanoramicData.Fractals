# Module Structure Fix

## Problem
The original module structure had a circular dependency:
- `fractal-shaders.js` defined `shaderCommon` AND imported from individual shader files
- Individual shader files (e.g., `mandelbrot.js`) imported `shaderCommon` from `fractal-shaders.js`
- This created a circular dependency: `fractal-shaders.js` → `mandelbrot.js` → `fractal-shaders.js`

JavaScript modules can't resolve this because when `mandelbrot.js` tries to import `shaderCommon`, the `fractal-shaders.js` module hasn't finished initializing yet.

## Solution
Created a separate `shader-common.js` file that contains only the `shaderCommon` constant.

### New Module Structure
```
shader-common.js (defines shaderCommon)
    ↑
    ├── shaders/mandelbrot.js (imports shaderCommon)
    ├── shaders/julia.js (imports shaderCommon)
    ├── shaders/burningship.js (imports shaderCommon)
    ├── shaders/tricorn.js (imports shaderCommon)
    ├── shaders/newton.js (imports shaderCommon)
    ├── shaders/phoenix.js (imports shaderCommon)
    ├── shaders/barnsleyfern.js (imports shaderCommon)
    ├── shaders/mandelbulb.js (imports shaderCommon)
    ├── shaders/mandelbulb-simpleshading.js (imports shaderCommon)
    ├── shaders/mandelbulb-raytraced.js (imports shaderCommon)
    └── shaders/landscape.js (imports shaderCommon)
    ↑
fractal-shaders.js (re-exports shaderCommon, imports all shaders)
```

### Benefits
1. **No circular dependencies**: Each module has a clear, one-way dependency
2. **Clean separation**: Common code is isolated
3. **Easy maintenance**: Individual shaders are in separate files
4. **Better performance**: Modules can be loaded and initialized correctly

### Files Changed
- Created: `PanoramicData.Fractals/wwwroot/js/shader-common.js`
- Updated: `PanoramicData.Fractals/wwwroot/js/fractal-shaders.js`
- Updated: All 11 shader files in `/shaders/` directory

## How It Works Now
1. `shader-common.js` exports `shaderCommon` (no dependencies)
2. Each shader file imports `shaderCommon` and concatenates it with their specific shader code
3. `fractal-shaders.js` re-exports `shaderCommon` and imports all individual shaders
4. `webgpu-interop.js` imports from `fractal-shaders.js` and gets everything it needs

## Browser Caching
If you still see the error after this fix, clear your browser cache or do a hard refresh:
- Chrome: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
- Edge: Ctrl+F5
