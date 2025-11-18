# PanoramicData.Fractals
GPU-Accelerated Fractal Explorer - WebGPU powered Blazor WebAssembly application

## ?? Live Demo
Coming soon to GitHub Pages!

## ? Features
- **WebGPU Acceleration**: Blazing fast fractal rendering using compute shaders
- **7 Fractal Types**: Mandelbrot, Julia, Burning Ship, Newton, Tricorn, Phoenix, Barnsley Fern
- **7 Color Palettes**: Classic, Fire, Ocean, Grayscale, Rainbow, Psychedelic, Ultra Fractal
- **Touch & Mouse Controls**: Intuitive pan and zoom on all devices
- **Fullscreen Experience**: Immersive fractal exploration
- **30fps Target**: Adaptive iteration depth for smooth performance

## ??? Phase 1 Complete ?
- ? Blazor WebAssembly project structure
- ? WebGPU initialization and interop
- ? Mandelbrot shader implementation
- ? Fullscreen canvas rendering
- ? WebGPU capability detection
- ? Color palette system

## ??? Technology Stack
- **Frontend**: Blazor WebAssembly (.NET 10)
- **GPU**: WebGPU with WGSL shaders
- **UI**: Bootstrap 5
- **Deployment**: GitHub Pages

## ?? Browser Requirements
- Chrome/Edge 113+
- WebGPU support required

## ?? Development Status
See [MASTER_PLAN.md](MASTER_PLAN.md) for the complete development roadmap.

**Current Phase**: Phase 1 Complete - Static Mandelbrot Rendering  
**Next Phase**: Phase 2 - Interactive Controls (Pan/Zoom)

## ?? Running Locally
```bash
cd src/PanoramicData.Fractals
dotnet run
```

## ?? License
See [LICENSE](LICENSE) file for details.
