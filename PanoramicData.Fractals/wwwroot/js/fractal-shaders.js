// Common shader code shared by all fractals
const shaderCommon = `
// Emulated double precision addition
fn add_dd(a_hi: f32, a_lo: f32, b_hi: f32, b_lo: f32) -> vec2<f32> {
    var s = a_hi + b_hi;
    var v = s - a_hi;
    var e = (a_hi - (s - v)) + (b_hi - v);
    var t = e + a_lo + b_lo;
    var z = s + t;
    return vec2<f32>(z, t - (z - s));
}

// Emulated double precision multiplication
fn mul_dd(a_hi: f32, a_lo: f32, b_hi: f32, b_lo: f32) -> vec2<f32> {
    var p = a_hi * b_hi;
    var e = fma(a_hi, b_hi, -p);
    e = fma(a_hi, b_lo, e);
    e = fma(a_lo, b_hi, e);
    var z = p + e;
    return vec2<f32>(z, e - (z - p) + a_lo * b_lo);
}

// Convert f32 to double-double representation
fn to_dd(a: f32) -> vec2<f32> {
    return vec2<f32>(a, 0.0);
}

struct FractalParams {
    width: u32,
    height: u32,
    centerX_hi: f32,
    centerX_lo: f32,
    centerY_hi: f32,
    centerY_lo: f32,
    zoom: f32,
    maxIterations: u32,
}

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> params: FractalParams;
@group(0) @binding(2) var<storage, read> palette: array<vec4<f32>>;
`;

export const fractalShaders = {
    mandelbrot: shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    let real_dd = add_dd(params.centerX_hi, params.centerX_lo, pixel_offset_x, 0.0);
    let imag_dd = add_dd(params.centerY_hi, params.centerY_lo, pixel_offset_y, 0.0);
    
    var zr_dd = to_dd(0.0);
    var zi_dd = to_dd(0.0);
    var iter = 0u;
    
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
        let zr2_dd = mul_dd(zr_dd.x, zr_dd.y, zr_dd.x, zr_dd.y);
        let zi2_dd = mul_dd(zi_dd.x, zi_dd.y, zi_dd.x, zi_dd.y);
        
        let mag_sq = zr2_dd.x + zi2_dd.x;
        if (mag_sq > 4.0) {
            iter = i;
            break;
        }
        
        let two_zr_dd = vec2<f32>(zr_dd.x * 2.0, zr_dd.y * 2.0);
        let zr_zi_dd = mul_dd(two_zr_dd.x, two_zr_dd.y, zi_dd.x, zi_dd.y);
        let new_zi_dd = add_dd(zr_zi_dd.x, zr_zi_dd.y, imag_dd.x, imag_dd.y);
        
        let zr2_minus_zi2_dd = add_dd(zr2_dd.x, zr2_dd.y, -zi2_dd.x, -zi2_dd.y);
        let new_zr_dd = add_dd(zr2_minus_zi2_dd.x, zr2_minus_zi2_dd.y, real_dd.x, real_dd.y);
        
        zr_dd = new_zr_dd;
        zi_dd = new_zi_dd;
        iter = i;
    }
    
    var color: vec4<f32>;
    if (iter >= params.maxIterations - 1u) {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        let zr = zr_dd.x;
        let zi = zi_dd.x;
        let mag_sq = zr * zr + zi * zi;
        let smooth_iter = f32(iter) + 1.0 - log2(log2(mag_sq) / 2.0);
        
        let paletteSize = arrayLength(&palette);
        let t = smooth_iter / f32(params.maxIterations);
        let paletteIndex = u32(clamp(t * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        color = palette[paletteIndex];
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`,

    burningship: shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    let real_dd = add_dd(params.centerX_hi, params.centerX_lo, pixel_offset_x, 0.0);
    let imag_dd = add_dd(params.centerY_hi, params.centerY_lo, pixel_offset_y, 0.0);
    
    var zr_dd = to_dd(0.0);
    var zi_dd = to_dd(0.0);
    var iter = 0u;
    
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
        // Take absolute values before squaring (Burning Ship modification)
        let abs_zr = abs(zr_dd.x);
        let abs_zi = abs(zi_dd.x);
        
        let zr2 = abs_zr * abs_zr;
        let zi2 = abs_zi * abs_zi;
        
        let mag_sq = zr2 + zi2;
        if (mag_sq > 4.0) {
            iter = i;
            break;
        }
        
        let new_zi = 2.0 * abs_zr * abs_zi + imag_dd.x;
        let new_zr = zr2 - zi2 + real_dd.x;
        
        zr_dd = to_dd(new_zr);
        zi_dd = to_dd(new_zi);
        iter = i;
    }
    
    var color: vec4<f32>;
    if (iter >= params.maxIterations - 1u) {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        let smooth_iter = f32(iter) + 1.0 - log2(log2(zr_dd.x * zr_dd.x + zi_dd.x * zi_dd.x) / 2.0);
        
        let paletteSize = arrayLength(&palette);
        let t = smooth_iter / f32(params.maxIterations);
        let paletteIndex = u32(clamp(t * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        color = palette[paletteIndex];
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`,

    julia: shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    // For Julia set, the pixel position is z, and c is constant
    var zr_dd = add_dd(params.centerX_hi, params.centerX_lo, pixel_offset_x, 0.0);
    var zi_dd = add_dd(params.centerY_hi, params.centerY_lo, pixel_offset_y, 0.0);
    
    // Julia set constant (classic: c = -0.4 + 0.6i)
    let c_real = -0.4;
    let c_imag = 0.6;
    
    var iter = 0u;
    
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
        let zr2_dd = mul_dd(zr_dd.x, zr_dd.y, zr_dd.x, zr_dd.y);
        let zi2_dd = mul_dd(zi_dd.x, zi_dd.y, zi_dd.x, zi_dd.y);
        
        let mag_sq = zr2_dd.x + zi2_dd.x;
        if (mag_sq > 4.0) {
            iter = i;
            break;
        }
        
        let two_zr_dd = vec2<f32>(zr_dd.x * 2.0, zr_dd.y * 2.0);
        let zr_zi_dd = mul_dd(two_zr_dd.x, two_zr_dd.y, zi_dd.x, zi_dd.y);
        
        let zr2_minus_zi2_dd = add_dd(zr2_dd.x, zr2_dd.y, -zi2_dd.x, -zi2_dd.y);
        
        zr_dd = add_dd(zr2_minus_zi2_dd.x, zr2_minus_zi2_dd.y, c_real, 0.0);
        zi_dd = add_dd(zr_zi_dd.x, zr_zi_dd.y, c_imag, 0.0);
        iter = i;
    }
    
    var color: vec4<f32>;
    if (iter >= params.maxIterations - 1u) {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        let smooth_iter = f32(iter) + 1.0 - log2(log2(zr_dd.x * zr_dd.x + zi_dd.x * zi_dd.x) / 2.0);
        
        let paletteSize = arrayLength(&palette);
        let t = smooth_iter / f32(params.maxIterations);
        let paletteIndex = u32(clamp(t * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        color = palette[paletteIndex];
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`,

    tricorn: shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    let real_dd = add_dd(params.centerX_hi, params.centerX_lo, pixel_offset_x, 0.0);
    let imag_dd = add_dd(params.centerY_hi, params.centerY_lo, pixel_offset_y, 0.0);
    
    var zr_dd = to_dd(0.0);
    var zi_dd = to_dd(0.0);
    var iter = 0u;
    
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
        let zr2_dd = mul_dd(zr_dd.x, zr_dd.y, zr_dd.x, zr_dd.y);
        let zi2_dd = mul_dd(zi_dd.x, zi_dd.y, zi_dd.x, zi_dd.y);
        
        let mag_sq = zr2_dd.x + zi2_dd.x;
        if (mag_sq > 4.0) {
            iter = i;
            break;
        }
        
        // Tricorn: conjugate before squaring (negate imaginary part)
        let two_zr_dd = vec2<f32>(zr_dd.x * 2.0, zr_dd.y * 2.0);
        let neg_zi_dd = vec2<f32>(-zi_dd.x, -zi_dd.y);
        let zr_zi_dd = mul_dd(two_zr_dd.x, two_zr_dd.y, neg_zi_dd.x, neg_zi_dd.y);
        
        let zr2_minus_zi2_dd = add_dd(zr2_dd.x, zr2_dd.y, -zi2_dd.x, -zi2_dd.y);
        let new_zr_dd = add_dd(zr2_minus_zi2_dd.x, zr2_minus_zi2_dd.y, real_dd.x, real_dd.y);
        let new_zi_dd = add_dd(zr_zi_dd.x, zr_zi_dd.y, imag_dd.x, imag_dd.y);
        
        zr_dd = new_zr_dd;
        zi_dd = new_zi_dd;
        iter = i;
    }
    
    var color: vec4<f32>;
    if (iter >= params.maxIterations - 1u) {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        let smooth_iter = f32(iter) + 1.0 - log2(log2(zr_dd.x * zr_dd.x + zi_dd.x * zi_dd.x) / 2.0);
        
        let paletteSize = arrayLength(&palette);
        let t = smooth_iter / f32(params.maxIterations);
        let paletteIndex = u32(clamp(t * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        color = palette[paletteIndex];
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`,

    newton: shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
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
`,

    phoenix: shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    let cr = params.centerX_hi + pixel_offset_x;
    let ci = params.centerY_hi + pixel_offset_y;
    
    var zr = 0.0;
    var zi = 0.0;
    var prev_zr = 0.0;
    var prev_zi = 0.0;
    var iter = 0u;
    
    // Phoenix fractal parameters
    let p = 0.56667;
    let q = -0.5;
    
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
        let zr2 = zr * zr - zi * zi;
        let zi2 = 2.0 * zr * zi;
        
        let new_zr = zr2 + cr + p * prev_zr;
        let new_zi = zi2 + ci + p * prev_zi;
        
        prev_zr = zr;
        prev_zi = zi;
        zr = new_zr;
        zi = new_zi;
        
        let mag_sq = zr * zr + zi * zi;
        if (mag_sq > 4.0) {
            iter = i;
            break;
        }
        
        iter = i;
    }
    
    var color: vec4<f32>;
    if (iter >= params.maxIterations - 1u) {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        let smooth_iter = f32(iter) + 1.0 - log2(log2(zr * zr + zi * zi) / 2.0);
        
        let paletteSize = arrayLength(&palette);
        let t = smooth_iter / f32(params.maxIterations);
        let paletteIndex = u32(clamp(t * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        color = palette[paletteIndex];
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`,

    barnsleyfern: shaderCommon + `
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    // For Barnsley Fern, we'll create a histogram-based rendering
    // This is a simplified version - just showing a pattern
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    let px = params.centerX_hi + pixel_offset_x;
    let py = params.centerY_hi + pixel_offset_y;
    
    // Simple pattern for now (full IFS would require different approach)
    var density = 0.0;
    for (var i = 0u; i < 100u; i = i + 1u) {
        let t = f32(i) / 100.0;
        let fx = sin(t * 6.28) * 0.5;
        let fy = t - 0.5;
        
        let dist = sqrt((px - fx) * (px - fx) + (py - fy) * (py - fy));
        density += exp(-dist * 50.0);
    }
    
    var color: vec4<f32>;
    let paletteSize = arrayLength(&palette);
    let t = clamp(density, 0.0, 1.0);
    let paletteIndex = u32(t * f32(paletteSize - 1u));
    color = palette[paletteIndex];
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`
};
