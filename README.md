# PanoramicData.Fractals

An interactive fractal explorer that runs entirely in the browser and does its rendering on your GPU. It is a .NET 10 Blazor WebAssembly application that drives WebGPU compute shaders written in WGSL.

**Live demo: <https://fractals.panoramicdata.com/>**

There is no server-side rendering and nothing to install: the page downloads the app, compiles the shaders on your machine and renders every frame on your graphics card.

## Fractals

The explorer offers nine views, selectable from the control panel or the `fractal` URL parameter.

| View | `fractal=` | Notes |
|---|---|---|
| **Mandelbulb (3D)** | `mandelbulb` | A power-8 Mandelbulb, ray-marched in real time with a distance estimator. Three rendering modes: distance-estimation colouring, simple two-light shading, and a "ray traced" mode with soft shadows, ambient occlusion, specular highlights and an environment gradient. Free-flying camera. |
| Mandelbrot set | `mandelbrot` | Float-float arithmetic (see [Precision](#precision)), smooth colouring. |
| Julia set | `julia` | Fixed constant c = −0.4 + 0.6i. Float-float arithmetic. |
| Burning Ship | `burningship` | Float-float arithmetic. |
| Tricorn (Mandelbar) | `tricorn` | Float-float arithmetic. |
| Newton fractal | `newton` | Newton's method for z³ − 1 = 0, single precision. |
| Phoenix | `phoenix` | Phoenix recurrence with p = 0.56667, single precision. |
| Landscape | `landscape` | A procedural, top-down map built from fractional Brownian motion (fBm) value noise, layering terrain, lakes, rivers, woodland, settlements and clouds. |
| Barnsley Fern | `barnsleyfern` | **Placeholder.** This currently renders a simple density pattern, not the Barnsley iterated function system. |

Seven colour palettes are available for the palette-driven views: Classic, Fire, Ocean, Grayscale, Rainbow, Psychedelic and Ultra Fractal. The Landscape view uses its own fixed colours.

## Controls

**2D views:** drag to pan, scroll or pinch to zoom.

**Mandelbulb:** drag to rotate the camera, Shift + drag to move it, scroll to zoom (field of view). Keyboard: <kbd>W</kbd>/<kbd>S</kbd> forward and back, <kbd>A</kbd>/<kbd>D</kbd> strafe, <kbd>Z</kbd>/<kbd>Q</kbd> up and down, <kbd>E</kbd>/<kbd>C</kbd> zoom in and out.

The control panel also sets the maximum iteration count, resets the view, saves a screenshot and shows a controls reference.

## Sharing a view

The address bar is kept in step with the current view, so any view can be shared by copying the URL.

```text
https://fractals.panoramicdata.com/?fractal=mandelbulb
https://fractals.panoramicdata.com/?fractal=julia&zoom=1.5
https://fractals.panoramicdata.com/?fractal=mandelbrot&c=-0.7436438870+0.1318259049i&zoom=1000000&iter=1000
```

| Parameter | Applies to | Meaning |
|---|---|---|
| `fractal` | all | View, from the table above |
| `palette` | all | Palette name, lower case without spaces, e.g. `ultrafractal` |
| `iter` | all | Maximum iterations, 10 to 10,000 |
| `c` | 2D | Centre of the view in complex notation, e.g. `-0.5+0.3i` |
| `x`, `y` | 2D | Centre as separate real and imaginary parts (alternative to `c`) |
| `zoom` | 2D | Zoom factor, 0.1 to 10¹⁴ |
| `cx`, `cy`, `cz` | 3D | Camera position |
| `yaw`, `pitch` | 3D | Camera orientation in radians |
| `fov` | 3D | Field of view |
| `rendermode` | 3D | `distanceestimation`, `simpleshading` or `raytraced` |

For the Julia set, `c` is the centre of the view, not the Julia constant, which is fixed.

## How it works

1. **Blazor WebAssembly (.NET 10)** runs the application: UI, view state, URL handling, input and palette generation. `Pages/Home.razor` is the main page.
2. **JavaScript interop.** `Services/WebGPUInterop.cs` calls into `wwwroot/js/webgpu-interop.js`, which owns the WebGPU device, canvas context, pipelines and buffers, and handles mouse and touch input.
3. **WGSL compute shaders** in `wwwroot/shaders/` do the rendering. Each frame dispatches a compute shader in 8 × 8 workgroups, with one invocation per pixel, writing to a storage texture that is then drawn to the canvas. The view parameters and a 256-entry colour palette are passed in as a uniform buffer and a storage buffer.
4. **Shader loading.** `wwwroot/js/fractal-shaders.js` fetches the `.wgsl` files at runtime. Most 2D shaders are prefixed with `common.wgsl`, which holds the shared bindings and float-float arithmetic. The Mandelbulb variants and Landscape are self-contained.

## Precision

GPUs in the browser offer 32-bit floats only; WGSL has no 64-bit floating-point type. To zoom further than single precision allows, the Mandelbrot, Julia, Burning Ship and Tricorn shaders represent each coordinate as an unevaluated sum of two `f32` values (a "float-float", or double-single, representation) using error-free addition and fused multiply-add. This gives roughly twice the significand bits of a single `f32`. It is not IEEE double precision, and it is not the double-double (two `f64`) arithmetic used on CPUs.

The application caps zoom at 10¹⁴, but that is a limit in the code, not a measured depth. Expect image quality to degrade before the cap is reached. Newton, Phoenix, Landscape and the Mandelbulb use ordinary single precision.

## Browser requirements

**WebGPU is required. There is no WebGL or CPU fallback.** If `navigator.gpu` is absent, the page shows a "WebGPU Not Supported" message instead of the explorer. If WebGPU is present but no GPU adapter is available, a generic initialisation error is shown.

According to [caniuse.com/webgpu](https://caniuse.com/webgpu), checked on 19 October 2026:

- Chrome and Edge support WebGPU from version 113 on desktop. On Linux, support depends on hardware and drivers.
- Chrome for Android and Samsung Internet support it.
- Safari on iOS supports it from version 26. Desktop Safari has partial support from version 26 (enabled by default on macOS 26 Tahoe or later).
- Firefox has partial support only, enabled by default on Windows and, in recent versions, on macOS 26 or later on Apple Silicon. Firefox for Android does not enable it by default.
- caniuse estimates global support at about 86% of users, rising to about 88% including partial support.

Rendering speed depends heavily on the GPU. The ray-traced Mandelbulb mode is the most demanding view.

## Building and running locally

Prerequisite: the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

```bash
git clone https://github.com/panoramicdata/PanoramicData.Fractals.git
cd PanoramicData.Fractals
dotnet build -c Release
dotnet run --project PanoramicData.Fractals
```

The development server listens on <http://localhost:5078> by default. Open it in a WebGPU-capable browser.

To produce the static site:

```bash
dotnet publish PanoramicData.Fractals/PanoramicData.Fractals.csproj -c Release -o publish
```

The `publish/wwwroot` folder can be served by any static host.

## Deployment

Every push to `main` triggers the [GitHub Actions workflow](.github/workflows/deploy-to-gh-pages.yml), which builds and publishes the app to GitHub Pages at the custom domain configured in `wwwroot/CNAME`.

## Repository layout

```text
PanoramicData.Fractals/       Blazor WebAssembly project
  Pages/Home.razor            Main page: UI, state, input, URL handling
  Services/                   WebGPU interop wrapper and view state
  Models/                     Fractal types, palettes, viewport and 3D camera
  wwwroot/js/                 WebGPU setup, rendering and input handling
  wwwroot/shaders/            WGSL compute shaders
docs/development/             Historical planning and design notes
```

The notes in `docs/development/` were written during development. They are kept for history and may not match the current code.

## Contributing

Issues and pull requests are welcome. Please test every view in a WebGPU-capable browser before submitting a change, and check the browser console for shader or pipeline errors.

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

## Licence

MIT. See [LICENSE](LICENSE).
