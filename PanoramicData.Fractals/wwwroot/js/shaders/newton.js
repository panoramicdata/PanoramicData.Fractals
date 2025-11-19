import { shaderCommon } from '../shader-common.js';

export const newtonShader = shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale * aspect;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    var zr = params.centerX_hi + pixel_offset_x;
    var zi = params.centerY_hi + pixel_offset_y;
    
    var iter = 0u;
    
    // Newton's method for z^3 - 1 = 0
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
        // z^3
        let zr2 = zr * zr - zi * zi;
        let zi2 = 2.0 * zr * zi;
        let zr3 = zr2 * zr - zi2 * zi;
        let zi3 = zr2 * zi + zi2 * zr;
        
        // z^3 - 1
        let fr = zr3 - 1.0;
        let fi = zi3;
        
        // 3z^2 (derivative)
        let dfr = 3.0 * (zr * zr - zi * zi);
        let dfi = 6.0 * zr * zi;
        
        // f/f' (complex division)
        let denom = dfr * dfr + dfi * dfi;
        if (denom < 0.000001) {
            break;
        }
        
        let qr = (fr * dfr + fi * dfi) / denom;
        let qi = (fi * dfr - fr * dfi) / denom;
        
        // z = z - f/f'
        zr = zr - qr;
        zi = zi - qi;
        
        // Check convergence
        if (qr * qr + qi * qi < 0.000001) {
            iter = i;
            break;
        }
        
        iter = i;
    }
    
    var color: vec4<f32>;
    if (iter >= params.maxIterations - 1u) {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        let paletteSize = arrayLength(&palette);
        let t = f32(iter) / f32(params.maxIterations);
        let paletteIndex = u32(clamp(t * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        color = palette[paletteIndex];
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`;
