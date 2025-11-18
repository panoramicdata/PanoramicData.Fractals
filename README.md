# PanoramicData.Fractals
GPU-Accelerated Fractal Explorer - WebGPU powered Blazor WebAssembly application

## 🌐 Live Demo
**https://fractals.panoramicdata.com/**

## ✨ Features
- **WebGPU Acceleration**: Blazing fast fractal rendering using compute shaders
- **7 Fractal Types**: Mandelbrot, Julia, Burning Ship, Newton, Tricorn, Phoenix, Barnsley Fern
- **7 Color Palettes**: Classic, Fire, Ocean, Grayscale, Rainbow, Psychedelic, Ultra Fractal
- **Touch & Mouse Controls**: Intuitive pan and zoom on all devices
- **Deep Linking**: Share your discoveries with URL parameters
- **Fullscreen Experience**: Immersive fractal exploration
- **Double-Double Precision**: Deep zoom support up to 10^14

## 🔗 Deep Linking Examples

Share your favorite fractal views with these URL patterns:

### Basic Examples
```
# Mandelbrot Set at default view
https://fractals.panoramicdata.com/

# Julia Set
https://fractals.panoramicdata.com/?fractal=julia

# Burning Ship fractal
https://fractals.panoramicdata.com/?fractal=burningship
```

### Advanced Examples with Coordinates
```
# Mandelbrot with specific center and zoom
https://fractals.panoramicdata.com/?fractal=mandelbrot&c=-0.5+0i&zoom=2&iter=500

# Julia Set with complex constant
https://fractals.panoramicdata.com/?fractal=julia&c=-0.4+0.6i&zoom=1.5

# Deep zoom into Mandelbrot
https://fractals.panoramicdata.com/?fractal=mandelbrot&c=-0.7436438870+0.1318259049i&zoom=1000000&iter=1000
```

### URL Parameters

| Parameter | Description | Example Values |
|-----------|-------------|----------------|
| `fractal` | Fractal type | `mandelbrot`, `julia`, `burningship`, `tricorn`, `newton`, `phoenix`, `barnsleyfern` |
| `c` | Center coordinates (complex notation) | `-0.5+0.3i`, `0.285+0.01i` |
| `x` | Center X coordinate (alternative to `c`) | `-0.5`, `0.285` |
| `y` | Center Y coordinate (alternative to `c`) | `0.3`, `0.01` |
| `zoom` | Zoom level | `1`, `100`, `1000000` |
| `iter` | Max iterations | `100`, `500`, `1000` |

### Complex Number Notation
The `c` parameter supports standard complex notation:
- Positive imaginary: `0.1+0.3i`
- Negative imaginary: `0.1-0.3i`
- Negative real: `-0.4+0.6i`
- Real only: `0.5+0i` or just use `x` parameter

## 🎨 Fractal Types

1. **Mandelbrot Set** - The iconic fractal with infinite self-similar detail
2. **Julia Set** - Filled Julia set with c = -0.4 + 0.6i
3. **Burning Ship** - Creates ship-like silhouettes
4. **Tricorn (Mandelbar)** - Mandelbrot with complex conjugate
5. **Newton Fractal** - Newton's method for z³ - 1 = 0
6. **Phoenix** - Recursive formula with memory
7. **Barnsley Fern** - Nature-inspired IFS pattern

## ⚡ Technology Stack
- **Frontend**: Blazor WebAssembly (.NET 10)
- **GPU**: WebGPU with WGSL shaders
- **Precision**: Emulated double-double arithmetic
- **UI**: Bootstrap 5 + Custom CSS
- **Deployment**: GitHub Pages with custom domain

## 🌍 Browser Requirements
- Chrome/Edge 113+ (WebGPU support required)
- Hardware GPU recommended for best performance

## 🚀 Development Status

### ✅ Phase 1 Complete - Static Rendering
- Blazor WebAssembly project structure
- WebGPU initialization and interop
- Mandelbrot shader implementation
- Fullscreen canvas rendering
- WebGPU capability detection
- Color palette system

### ✅ Phase 2 Complete - Interactive Controls
- Pan and zoom (mouse + touch)
- Fractal type selector
- URL parameter deep linking
- Window resize handling

### ✅ Phase 3 Complete - Multiple Fractals
- All 7 fractal types implemented
- Dynamic shader loading
- Double-double precision for deep zooms
- Smooth coloring algorithm

### 🔄 Phase 4 - In Progress
- UI controls for iterations and palettes
- Performance optimizations
- Additional fractal parameters

## 💻 Running Locally
```bash
git clone https://github.com/panoramicdata/PanoramicData.Fractals.git
cd PanoramicData.Fractals/PanoramicData.Fractals
dotnet run
```

## 🤝 Contributing
Contributions welcome! Feel free to:
- Add new fractal types
- Improve shader performance
- Enhance UI/UX
- Add color palettes
- Optimize precision algorithms

## 📄 License
See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments
- WebGPU specification and community
- Fractal mathematics pioneers
- .NET and Blazor teams

---

**Explore the infinite beauty of mathematics at https://fractals.panoramicdata.com/** 🌀✨
