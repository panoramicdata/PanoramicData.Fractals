# GitHub Copilot Instructions for PanoramicData.Fractals

## Testing Before Commit

**CRITICAL**: Always test changes before committing to git, especially when:
- Modifying file paths or resource loading
- Changing runtime behavior (async/await, fetch, etc.)
- Refactoring shader or JavaScript code
- Making changes that affect production

### Pre-Commit Checklist
1. **Build**: Run `dotnet build` and verify no errors
2. **Run**: Start the application and test the affected functionality
3. **Verify**: Check browser console for errors
4. **Test all variants**: For shader changes, test all fractal types including:
   - All 2D fractals (Mandelbrot, Julia, etc.)
   - All 3D Mandelbulb variants (distance estimation, simple shading, ray traced)
   - Landscape fractal
5. **Only then commit**: If all tests pass

## Common Pitfalls to Avoid

### File Naming Conventions
- Shader files use **hyphens** in filenames: `mandelbulb-raytraced.wgsl`
- C# generates names with **underscores**: `mandelbulb_raytraced`
- Always normalize naming (underscore → hyphen) when loading files

### Path Changes
- When moving files (e.g., `js/shaders` → `shaders`), update ALL references:
  - JavaScript `fetch()` calls
  - Module imports
  - Documentation
- Test the application to ensure all paths work

### Async/Sync Refactoring
- Changing from sync to async requires updates throughout the call chain
- Verify all callers use `await`
- Test runtime behavior, not just compilation

## Project-Specific Notes

### Shader System
- **Common shader**: `shaders/common.wgsl` (shared functions)
- **Individual shaders**: `shaders/*.wgsl` (specific fractal implementations)
- **Loader**: `js/fractal-shaders.js` (loads and combines shaders at runtime)
- **Standalone shaders** don't use common.wgsl: landscape, mandelbulb variants

### WebGPU Architecture
- Shaders are loaded via `fetch()` at runtime
- Name normalization happens in `getShaderCode()` function
- Pipeline creation is async and cached

## Quality Standards

1. **Always verify changes work in the browser before committing**
2. Test edge cases and error paths
3. Check console for warnings/errors
4. Verify all fractal types still render correctly
5. Update documentation when changing architecture
