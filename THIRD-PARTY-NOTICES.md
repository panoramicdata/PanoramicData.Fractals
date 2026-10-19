# Third-party notices

PanoramicData.Fractals is licensed under the MIT Licence (see [LICENSE](LICENSE)). Parts of its WGSL shaders are adapted from the third-party work listed below. Each adapted function has a source comment in the shader.

## Licensed code

### Hash without Sine, by David Hoskins

- **Source:** <https://www.shadertoy.com/view/4djSRW>
- **Used in:** `PanoramicData.Fractals/wwwroot/shaders/landscape.wgsl`. `hash21` and `hash22` are WGSL ports of `hash12` and `hash22`.

```text
MIT License

Copyright (c) 2014 David Hoskins.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Raymarching - Primitives, by Inigo Quilez

- **Source:** <https://www.shadertoy.com/view/Xds3zN>. The soft-shadow technique is described at <https://iquilezles.org/articles/rmshadows/>.
- **Used in:** `PanoramicData.Fractals/wwwroot/shaders/mandelbulb-raytraced.wgsl`. `calculateAO` is adapted from `calcAO`, and `softShadow` from `softshadow`.

```text
The MIT License

Copyright © 2013 Inigo Quilez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Acknowledgements

These are widely published techniques. We know of no licence terms that apply, but we credit them as a courtesy.

- **Mandelbulb distance estimator:** Mikael Hvidtfeldt Christensen, "Distance Estimated 3D Fractals (V): The Mandelbulb & Different DE Approximations", 2011. <http://blog.hvidtfeldts.net/index.php/2011/09/distance-estimated-3d-fractals-v-the-mandelbulb-different-de-approximations/>. Used in `mandelbulb.wgsl`, `mandelbulb-simpleshading.wgsl` and `mandelbulb-raytraced.wgsl`.
- **2D value noise:** the interpolation form popularised by Morgan McGuire, <https://www.shadertoy.com/view/4dS3Wd>, as presented in *The Book of Shaders*, <https://thebookofshaders.com/11/>. Used in `landscape.wgsl`.
