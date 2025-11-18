# MASTER PLAN: CUDA-Accelerated Fractals in Blazor WebAssembly

## Project Overview
**Repository**: https://github.com/panoramicdata/PanoramicData.Fractals  
**Goal**: Create a high-performance, single-page Blazor WebAssembly application that renders fractals at 30fps using WebGPU, with intuitive touch and mouse controls, deployable to GitHub Pages.

## Executive Summary
Build a fullscreen fractal explorer leveraging WebGPU for GPU-accelerated rendering in the browser. Users can explore 9 different fractal types through an intuitive interface with pinch-to-zoom, drag-to-pan, and smooth 30fps rendering with adaptive iteration depth.

---

## Technical Stack

### Frontend
- **Framework**: Blazor WebAssembly (.NET 8+)
- **GPU Acceleration**: WebGPU (via JavaScript interop)
- **UI Framework**: Bootstrap 5
- **Touch/Mouse Input**: JavaScript Pointer Events API
- **Language**: C# (Blazor components), WGSL (WebGPU shaders)

### CI/CD
- **Platform**: GitHub Actions
- **Hosting**: GitHub Pages
- **Build**: .NET SDK + Static Web Assets

### Browser Support
- Chrome/Edge 113+ (WebGPU stable)
- Firefox Nightly (WebGPU experimental)
- Safari Technology Preview (WebGPU in development)

---

## Architecture

### High-Level Components

```
???????????????????????????????????????????????????????
?                 Blazor WebAssembly                  ?
?                                                     ?
?  ????????????????????????????????????????????????? ?
?  ?         App.razor (Main Layout)               ? ?
?  ?  ???????????????????????????????????????????  ? ?
?  ?  ?  Bootstrap Dropdowns (Top Right)        ?  ? ?
?  ?  ?  - Fractal Type Selector                ?  ? ?
?  ?  ?  - Color Palette Selector               ?  ? ?
?  ?  ???????????????????????????????????????????  ? ?
?  ?                                               ? ?
?  ?  ???????????????????????????????????????????  ? ?
?  ?  ?  Canvas (Fullscreen)                    ?  ? ?
?  ?  ?  - Pointer Event Handlers               ?  ? ?
?  ?  ?  - WebGPU Rendering Context             ?  ? ?
?  ?  ???????????????????????????????????????????  ? ?
?  ????????????????????????????????????????????????? ?
?                                                     ?
?  ????????????????????????????????????????????????? ?
?  ?      FractalRenderer.cs (C#)                  ? ?
?  ?  - State Management                           ? ?
?  ?  - Zoom/Pan Calculations                      ? ?
?  ?  - Adaptive Iteration Depth                   ? ?
?  ?  - JS Interop Bridge                          ? ?
?  ????????????????????????????????????????????????? ?
?                          ?                          ?
?                          ?                          ?
?  ????????????????????????????????????????????????? ?
?  ?      webgpu-interop.js (JavaScript)           ? ?
?  ?  - WebGPU Initialization                      ? ?
?  ?  - Shader Compilation                         ? ?
?  ?  - Render Pipeline Management                 ? ?
?  ?  - Pointer Events Processing                  ? ?
?  ????????????????????????????????????????????????? ?
?                          ?                          ?
???????????????????????????????????????????????????????
                           ?
                   ????????????????
                   ?   WebGPU     ?
                   ?   (Browser)  ?
                   ????????????????
                           ?
                           ?
                   ????????????????
                   ?   GPU        ?
                   ?   Hardware   ?
                   ????????????????
```

### File Structure
```
PanoramicData.Fractals/
??? .github/
?   ??? workflows/
?       ??? deploy.yml                 # GitHub Actions CI/CD
??? src/
?   ??? PanoramicData.Fractals/
?       ??? PanoramicData.Fractals.csproj
?       ??? Program.cs
?       ??? App.razor
?       ??? Pages/
?       ?   ??? Index.razor            # Main fractal viewer page
?       ??? Components/
?       ?   ??? FractalCanvas.razor    # Canvas component
?       ?   ??? FractalControls.razor  # Dropdown controls
?       ??? Services/
?       ?   ??? FractalRenderer.cs     # Core rendering logic
?       ?   ??? WebGPUInterop.cs       # JS interop service
?       ?   ??? FractalState.cs        # State management
?       ??? Models/
?       ?   ??? FractalType.cs         # Enum for fractal types
?       ?   ??? ColorPalette.cs        # Color scheme definitions
?       ?   ??? ViewPort.cs            # Zoom/pan state
?       ??? Shaders/
?       ?   ??? mandelbrot.wgsl
?       ?   ??? julia.wgsl
?       ?   ??? burning-ship.wgsl
?       ?   ??? newton.wgsl
?       ?   ??? tricorn.wgsl
?       ?   ??? phoenix.wgsl
?       ?   ??? barnsley-fern.wgsl
?       ?   ??? fractal-landscape.wgsl  # Future
?       ?   ??? fractal-city.wgsl       # Future
?       ??? wwwroot/
?       ?   ??? index.html
?       ?   ??? css/
?       ?   ?   ??? app.css            # Custom styles
?       ?   ??? js/
?       ?       ??? webgpu-interop.js  # WebGPU implementation
?       ??? _Imports.razor
??? MASTER_PLAN.md                     # This document
??? README.md
??? LICENSE
??? .gitignore
```

---

## Fractal Types

### Phase 1: Core Mathematical Fractals (MVP)
1. **Mandelbrot Set** - The classic: z = z² + c
2. **Julia Set** - Variation with fixed c parameter
3. **Burning Ship** - Abs variation: z = (|Re(z)| + i|Im(z)|)² + c
4. **Newton Fractal** - Root-finding convergence visualization
5. **Tricorn (Mandelbar)** - Complex conjugate variation
6. **Phoenix Fractal** - z = z² + Re(c) + Im(c)·previous
7. **Barnsley Fern** - IFS (Iterated Function System) fractal

### Phase 2: Advanced Fractals (Future Enhancement)
8. **Fractal Landscape** - 3D terrain using Perlin/Diamond-Square
9. **Fractal City** - Procedural 3D cityscape with fractal buildings

---

## Features

### MVP (Minimum Viable Product)
- ? Fullscreen canvas rendering
- ? WebGPU-accelerated fractal computation
- ? Touch support (pinch-to-zoom, drag-to-pan)
- ? Mouse support (scroll-to-zoom, drag-to-pan)
- ? Two Bootstrap dropdowns (top-right):
  - Fractal type selector (7 types)
  - Color palette selector (5-7 palettes)
- ? Adaptive iteration depth targeting 30fps
- ? Smooth interpolation during zoom/pan
- ? Responsive design (phone, tablet, desktop)
- ? GitHub Pages deployment

### Phase 2 Enhancements
- ?? URL-based state (shareable links)
- ?? Manual iteration depth override
- ?? Animation/auto-explore mode
- ?? Screenshot/download functionality
- ?? Fractal Landscape rendering
- ?? Fractal City rendering
- ?? Performance metrics overlay
- ?? Preset zoom locations (interesting areas)

---

## User Interaction Design

### Touch Gestures (Tablets/Phones)
- **Single finger drag**: Pan the viewport
- **Pinch (two fingers)**: Zoom in/out
- **Double tap**: Zoom in 2x at tap location
- **Two-finger double tap**: Zoom out 2x

### Mouse/Trackpad
- **Left click + drag**: Pan the viewport
- **Scroll wheel**: Zoom in/out at cursor position
- **Double click**: Zoom in 2x at click location
- **Ctrl + scroll**: Slower, finer zoom control

### Keyboard (Optional Phase 2)
- **Arrow keys**: Pan viewport
- **+/-**: Zoom in/out
- **Home**: Reset to default view
- **Space**: Toggle animation mode

---

## Performance Strategy

### 30fps Target
- **Frame Budget**: 33.33ms per frame
- **WebGPU Compute**: ~20ms (fractal calculation)
- **CPU/JS Overhead**: ~5ms (state management)
- **Browser Overhead**: ~8ms (compositing, events)

### Adaptive Iteration Depth
```
Algorithm:
1. Start with default iterations (e.g., 256)
2. Measure frame time after each render
3. If frame time > 35ms: decrease iterations by 10%
4. If frame time < 28ms: increase iterations by 5%
5. Clamp iterations between 64 and 2048
6. Apply smoothing (rolling average of last 5 frames)
```

### WebGPU Optimization
- Use compute shaders for parallel pixel processing
- Double buffering for smooth rendering
- Lazy re-render (only on zoom/pan/config change)
- Progressive rendering (low-res preview ? full-res)

---

## Color Palettes

### Default Palettes (Phase 1)
1. **Classic** - Blue/purple gradient (traditional Mandelbrot)
2. **Fire** - Red/orange/yellow gradient
3. **Ocean** - Cyan/blue/deep blue
4. **Grayscale** - Black to white
5. **Rainbow** - Full spectrum HSV
6. **Psychedelic** - High-contrast multi-color
7. **Ultra Fractal** - Smooth gradient with banding

### Implementation
- Palettes stored as 256-entry lookup tables
- Passed to WebGPU shader as uniform buffer
- Smooth interpolation between palette entries

---

## WebGPU Shader Structure

### WGSL Compute Shader Template
```wgsl
@group(0) @binding(0) var<storage, read_write> output: array<u32>;
@group(0) @binding(1) var<uniform> params: FractalParams;
@group(0) @binding(2) var<storage, read> palette: array<vec3<f32>, 256>;

struct FractalParams {
    width: u32,
    height: u32,
    center_x: f32,
    center_y: f32,
    zoom: f32,
    max_iterations: u32,
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    // Map pixel to complex plane
    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;
    let real = params.center_x + (f32(x) / f32(params.width) - 0.5) * scale * aspect;
    let imag = params.center_y + (f32(y) / f32(params.height) - 0.5) * scale;
    
    // Fractal-specific calculation
    let iterations = calculateFractal(real, imag, params.max_iterations);
    
    // Map to color
    let color_index = u32(f32(iterations) * 256.0 / f32(params.max_iterations));
    let color = palette[color_index % 256u];
    
    // Write RGBA to output buffer
    let pixel_index = y * params.width + x;
    output[pixel_index] = packColor(color);
}

fn calculateFractal(c_real: f32, c_imag: f32, max_iter: u32) -> u32 {
    // Fractal-specific implementation
    // (Mandelbrot, Julia, etc.)
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '8.0.x'
    
    - name: Restore dependencies
      run: dotnet restore src/PanoramicData.Fractals
    
    - name: Build
      run: dotnet build src/PanoramicData.Fractals --configuration Release --no-restore
    
    - name: Publish
      run: dotnet publish src/PanoramicData.Fractals --configuration Release --output publish
    
    - name: Modify base href
      run: |
        sed -i 's|<base href="/" />|<base href="/PanoramicData.Fractals/" />|g' publish/wwwroot/index.html
    
    - name: Add .nojekyll
      run: touch publish/wwwroot/.nojekyll
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./publish/wwwroot
        force_orphan: true
```

### Deployment Steps
1. Push to `main` branch triggers workflow
2. Build Blazor WASM project
3. Publish to `publish` folder
4. Modify `index.html` base href for GitHub Pages subdirectory
5. Deploy to `gh-pages` branch
6. GitHub Pages serves from `gh-pages` branch
7. Accessible at: `https://panoramicdata.github.io/PanoramicData.Fractals/`

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Basic Blazor WASM app with WebGPU rendering

- [x] Create Blazor WebAssembly project structure
- [x] Implement WebGPU initialization in JavaScript
- [x] Create C# to JS interop layer
- [x] Implement basic Mandelbrot shader
- [x] Render static Mandelbrot to fullscreen canvas
- [x] Verify WebGPU capability detection

**Deliverable**: Static Mandelbrot set rendering
**Status**: ? COMPLETE

### Phase 2: Interaction (Week 2)
**Goal**: Mouse and touch controls

- [ ] Implement pointer event handlers
- [ ] Add pan functionality (drag)
- [ ] Add zoom functionality (wheel/pinch)
- [ ] Implement viewport state management
- [ ] Add zoom animation smoothing
- [ ] Test on desktop, tablet, phone

**Deliverable**: Interactive Mandelbrot with smooth zoom/pan

### Phase 3: Additional Fractals (Week 3)
**Goal**: All 7 core fractal types

- [ ] Implement Julia set shader
- [ ] Implement Burning Ship shader
- [ ] Implement Newton fractal shader
- [ ] Implement Tricorn shader
- [ ] Implement Phoenix fractal shader
- [ ] Implement Barnsley Fern shader
- [ ] Create fractal type enum and switching logic

**Deliverable**: 7 selectable fractal types

### Phase 4: UI & Polish (Week 4)
**Goal**: Bootstrap UI and color palettes

- [ ] Add Bootstrap 5 to project
- [ ] Create fractal type dropdown (top-right)
- [ ] Create color palette dropdown (top-right)
- [ ] Implement 7 color palettes
- [ ] Add loading indicator
- [ ] Add error handling for WebGPU unsupported browsers
- [ ] Responsive design testing

**Deliverable**: Complete UI with all features

### Phase 5: Performance Optimization (Week 5)
**Goal**: Achieve consistent 30fps

- [ ] Implement FPS monitoring
- [ ] Implement adaptive iteration depth
- [ ] Add progressive rendering (low?high res)
- [ ] Optimize shader code
- [ ] Profile and eliminate bottlenecks
- [ ] Test on lower-end devices

**Deliverable**: Smooth 30fps experience

### Phase 6: CI/CD (Week 6)
**Goal**: Automated deployment to GitHub Pages

- [ ] Create GitHub Actions workflow
- [ ] Configure GitHub Pages on repository
- [ ] Test deployment pipeline
- [ ] Add deployment badge to README
- [ ] Document deployment process
- [ ] Set up custom domain (optional)

**Deliverable**: Live site on GitHub Pages

### Phase 7: Future Enhancements (Post-MVP)
**Goal**: Advanced features

- [ ] URL-based state management
- [ ] Fractal Landscape implementation
- [ ] Fractal City implementation
- [ ] Screenshot functionality
- [ ] Preset zoom locations
- [ ] Animation mode
- [ ] Performance metrics overlay

---

## Technical Challenges & Solutions

### Challenge 1: WebGPU Browser Support
**Problem**: WebGPU is still emerging technology  
**Solution**: 
- Provide fallback message for unsupported browsers
- Link to Chrome/Edge for best experience
- Consider WebGL2 fallback in Phase 7

### Challenge 2: WASM + WebGPU Interop
**Problem**: Complex interop between C# and GPU  
**Solution**:
- Keep compute shaders in WGSL (native WebGPU)
- Use C# only for state management and logic
- Minimize data transfer between WASM and JS

### Challenge 3: Touch Event Performance
**Problem**: Touch events can be laggy on mobile  
**Solution**:
- Use passive event listeners
- Debounce/throttle zoom calculations
- Render preview at lower resolution during interaction

### Challenge 4: Adaptive Performance
**Problem**: Varying GPU capabilities across devices  
**Solution**:
- Dynamic iteration depth adjustment
- Progressive rendering (low-res preview first)
- Quality presets (auto/low/medium/high)

### Challenge 5: GitHub Pages Routing
**Problem**: SPA routing with subdirectory base path  
**Solution**:
- Set correct base href in index.html
- Use hash-based routing (not required for single page)
- Add .nojekyll file for proper asset serving

---

## Testing Strategy

### Browser Testing Matrix
| Browser | Version | Desktop | Mobile | Priority |
|---------|---------|---------|--------|----------|
| Chrome  | 113+    | ?      | ?     | High     |
| Edge    | 113+    | ?      | ?     | High     |
| Safari  | TP      | ?      | ?     | Medium   |
| Firefox | Nightly | ?      | ?     | Low      |

### Device Testing
- **Desktop**: 1920x1080, 2560x1440, 4K
- **Tablet**: iPad, Android tablets
- **Phone**: iPhone, Android phones
- **GPU Tiers**: Integrated, Mid-range, High-end

### Performance Testing
- FPS monitoring on all devices
- Memory leak detection (long sessions)
- Deep zoom stress testing
- Rapid palette/fractal switching

---

## Success Metrics

### MVP Success Criteria
- ? Renders all 7 fractals correctly
- ? Maintains 30fps on mid-range devices
- ? Touch and mouse controls work smoothly
- ? Deploys successfully to GitHub Pages
- ? Loads in < 5 seconds on broadband
- ? Zero console errors in supported browsers

### User Experience Goals
- Intuitive: User can zoom/explore without instructions
- Responsive: Actions feel immediate (< 100ms latency)
- Beautiful: Color palettes are visually appealing
- Stable: No crashes during extended use

---

## Dependencies

### .NET Packages
```xml
<PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly" Version="8.0.*" />
<PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly.DevServer" Version="8.0.*" />
```

### JavaScript Libraries
- **None** - Pure WebGPU API (native browser)
- Bootstrap 5.3+ (CDN or npm)

### Development Tools
- .NET 8 SDK
- Visual Studio 2022 or VS Code
- Chrome/Edge (for WebGPU testing)
- Git

---

## Documentation Requirements

### User-Facing
- README.md with live demo link
- In-app help tooltip (optional)
- Browser compatibility notice

### Developer-Facing
- Code comments for shader algorithms
- Architecture decision records (ADRs)
- Setup and build instructions
- Contribution guidelines

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WebGPU not widely supported | Medium | High | Clear browser requirements, consider WebGL2 fallback |
| Performance below 30fps | Medium | High | Adaptive iteration depth, progressive rendering |
| Mobile touch issues | Low | Medium | Extensive mobile testing, use proven pointer APIs |
| GitHub Pages deployment issues | Low | Low | Standard Blazor WASM deployment, well-documented |
| Shader complexity | Medium | Medium | Start simple, iterate, use reference implementations |

---

## Future Roadmap

### Version 1.0 (MVP)
- 7 core fractals
- Touch/mouse controls
- 2 dropdowns (fractal type, color palette)
- 30fps adaptive performance
- GitHub Pages deployment

### Version 1.1
- URL-based state (shareable views)
- Screenshot/download
- Preset interesting locations

### Version 2.0
- Fractal Landscape
- Fractal City
- 3D navigation
- Animation mode

### Version 3.0
- WebGL2 fallback
- VR support (WebXR)
- Collaborative exploration
- Custom shader upload

---

## Resources

### WebGPU Learning
- [WebGPU Spec](https://www.w3.org/TR/webgpu/)
- [WebGPU Samples](https://webgpu.github.io/webgpu-samples/)
- [WGSL Spec](https://www.w3.org/TR/WGSL/)

### Fractal Algorithms
- [Mandelbrot Set](https://en.wikipedia.org/wiki/Mandelbrot_set)
- [Julia Set](https://en.wikipedia.org/wiki/Julia_set)
- [Fractal List](https://en.wikipedia.org/wiki/List_of_fractals_by_Hausdorff_dimension)

### Blazor WebAssembly
- [Blazor Docs](https://learn.microsoft.com/en-us/aspnet/core/blazor/)
- [JS Interop](https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/)
- [GitHub Pages Deploy](https://swimburger.net/blog/dotnet/how-to-deploy-aspnet-blazor-webassembly-to-github-pages)

---

## Conclusion

This plan provides a comprehensive roadmap for building a high-performance, GPU-accelerated fractal explorer in Blazor WebAssembly. The phased approach ensures steady progress with testable milestones, while the extensible architecture allows for future enhancements like Fractal Landscapes and Cities.

**Next Steps**:
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1: Foundation
4. Iterate based on learnings

**Estimated Timeline**: 6 weeks to MVP, 12+ weeks for v2.0 with advanced fractals

---

*Document Version: 1.0*  
*Last Updated: 2024*  
*Author: Development Team*  
*Status: Awaiting Approval*
