// Re-export shaderCommon from the dedicated module
export { shaderCommon } from './shader-common.js';

// Import individual fractal shaders
import { mandelbrotShader } from './shaders/mandelbrot.js';
import { juliaShader } from './shaders/julia.js';
import { burningshipShader } from './shaders/burningship.js';
import { tricornShader } from './shaders/tricorn.js';
import { newtonShader } from './shaders/newton.js';
import { phoenixShader } from './shaders/phoenix.js';
import { barnsleyfernShader } from './shaders/barnsleyfern.js';
import { mandelbulbShader } from './shaders/mandelbulb.js';
import { mandelbulbSimpleShadingShader } from './shaders/mandelbulb-simpleshading.js';
import { mandelbulbRaytracedShader } from './shaders/mandelbulb-raytraced.js';
import { landscapeShader } from './shaders/landscape.js';

// Export all shaders as a collection
export const fractalShaders = {
    mandelbrot: mandelbrotShader,
    julia: juliaShader,
    burningship: burningshipShader,
    tricorn: tricornShader,
    newton: newtonShader,
    phoenix: phoenixShader,
    barnsleyfern: barnsleyfernShader,
    mandelbulb: mandelbulbShader,
    mandelbulb_simpleshading: mandelbulbSimpleShadingShader,
    mandelbulb_raytraced: mandelbulbRaytracedShader,
    landscape: landscapeShader
};
