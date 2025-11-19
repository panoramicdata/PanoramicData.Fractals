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

// Emulated double precision division
fn div_dd(a_hi: f32, a_lo: f32, b_hi: f32, b_lo: f32) -> vec2<f32> {
    var q1 = a_hi / b_hi;
    var r = add_dd(a_hi, a_lo, -b_hi * q1, -b_lo * q1);
    var q2 = r.x / b_hi;
    return vec2<f32>(q1 + q2, q2 - ((q1 + q2) - q1));
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
    fieldOfView: f32,  // NEW: Field of View for 3D camera zoom
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
    
    // Calculate aspect ratio and scale - USE SIMPLE DIVISION FOR CONSISTENCY
    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;  // Simple division, not double-double
    
    // Calculate normalized pixel coordinates (-0.5 to 0.5)
    let pixel_x = (f32(x) / f32(params.width) - 0.5) * aspect;
    let pixel_y = (f32(y) / f32(params.height) - 0.5);
    
    // Apply scale
    let pixel_offset_x = pixel_x * scale;
    let pixel_offset_y = pixel_y * scale;
    
    // Use double-double precision for CENTER coordinates only
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
    
    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;  // Consistent with other fractals
    
    let pixel_x = (f32(x) / f32(params.width) - 0.5) * aspect;
    let pixel_y = (f32(y) / f32(params.height) - 0.5);
    
    let pixel_offset_x = pixel_x * scale;
    let pixel_offset_y = pixel_y * scale;
    
    let real_dd = add_dd(params.centerX_hi, params.centerX_lo, pixel_offset_x, 0.0);
    let imag_dd = add_dd(params.centerY_hi, params.centerY_lo, pixel_offset_y, 0.0);
    
    var zr_dd = to_dd(0.0);
    var zi_dd = to_dd(0.0);
    var iter = 0u;
    
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
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
    
    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;  // Consistent with other fractals
    
    let pixel_x = (f32(x) / f32(params.width) - 0.5) * aspect;
    let pixel_y = (f32(y) / f32(params.height) - 0.5);
    
    let pixel_offset_x = pixel_x * scale;
    let pixel_offset_y = pixel_y * scale;
    
    var zr_dd = add_dd(params.centerX_hi, params.centerX_lo, pixel_offset_x, 0.0);
    var zi_dd = add_dd(params.centerY_hi, params.centerY_lo, pixel_offset_y, 0.0);
    
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
    
    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;  // Consistent with other fractals
    
    let pixel_x = (f32(x) / f32(params.width) - 0.5) * aspect;
    let pixel_y = (f32(y) / f32(params.height) - 0.5);
    
    let pixel_offset_x = pixel_x * scale;
    let pixel_offset_y = pixel_y * scale;
    
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
        let new_zi_dd = add_dd(zr_zi_dd.x, zr_izi_dd.y, imag_dd.x, imag_dd.y);
        
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
`,

    phoenix: shaderCommon + `
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
    
    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale * aspect;
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
`,

    // NEW: 3D Mandelbulb with Ray Marching - FPS CAMERA MODEL
    mandelbulb: shaderCommon + `
// Mandelbulb distance estimator
struct DEResult {
    distance: f32,
    iterations: u32,
    finalR: f32,
}

fn mandelbulb_de_full(pos: vec3<f32>, power: f32, maxIter: u32) -> DEResult {
    var z = pos;
    var dr = 1.0;
    var r = 0.0;
    var result: DEResult;
    result.iterations = 0u;
    
    for (var i = 0u; i < maxIter; i++) {
        r = length(z);
        
        if (r > 2.0) {
            result.iterations = i;
            break;
        }
        
        // Convert to spherical coordinates
        var theta = acos(clamp(z.z / r, -1.0, 1.0));
        var phi = atan2(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        // Scale and rotate the point
        var zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        // Convert back to cartesian coordinates
        z = zr * vec3<f32>(
            sin(theta) * cos(phi),
            sin(phi) * sin(theta),
            cos(theta)
        );
        z = z + pos;
        
        result.iterations = i;
    }
    
    result.finalR = r;
    result.distance = 0.5 * log(r) * r / dr;
    return result;
}

// Ray marching with FPS camera and FOV zoom - DISTANCE ESTIMATION MODE
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    // FPS Camera parameters from uniforms
    let camPosX = params.centerX_hi;     // Camera position X
    let camPosY = params.centerY_hi;     // Camera position Y
    let camPosZ = params.centerX_lo;     // Camera position Z
    let yaw = params.centerY_lo;         // Camera yaw (rotation around Y)
    let pitch = params.zoom;             // Camera pitch (rotation around X)
    let fov = params.fieldOfView;        // Field of view (for zoom)
    let power = 8.0;                     // Mandelbulb power
    
    // Normalized screen coordinates WITH FOV SCALING
    let aspect = f32(params.width) / f32(params.height);
    // FOV scales the UV coordinates - smaller FOV = zoomed in, larger FOV = zoomed out
    let uv = vec2<f32>(
        (f32(x) / f32(params.width) - 0.5) * aspect * fov,
        (f32(y) / f32(params.height) - 0.5) * fov
    );
    
    // Calculate camera orientation from yaw and pitch
    let cosYaw = cos(yaw);
    let sinYaw = sin(yaw);
    let cosPitch = cos(pitch);
    let sinPitch = sin(pitch);
    
    // Camera forward direction
    let forwardX = sinYaw * cosPitch;
    let forwardY = sinPitch;
    let forwardZ = -cosYaw * cosPitch;
    
    // Camera right direction
    let rightX = cosYaw;
    let rightY = 0.0;
    let rightZ = sinYaw;
    
    // Camera up direction (cross product of right and forward)
    let upX = rightY * forwardZ - rightZ * forwardY;
    let upY = rightZ * forwardX - rightX * forwardZ;
    let upZ = rightX * forwardY - rightY * forwardX;
    
    // Ray direction (camera forward + FOV-scaled screen offset)
    let rayDirX = forwardX + uv.x * rightX + uv.y * upX;
    let rayDirY = forwardY + uv.x * rightY + uv.y * upY;
    let rayDirZ = forwardZ + uv.x * rightZ + uv.y * upZ;
    
    // Normalize ray direction
    let rayLength = sqrt(rayDirX * rayDirX + rayDirY * rayDirY + rayDirZ * rayDirZ);
    let rayDir = vec3<f32>(rayDirX / rayLength, rayDirY / rayLength, rayDirZ / rayLength);
    
    // Camera position
    let camPos = vec3<f32>(camPosX, camPosY, camPosZ);
    
    // Ray march
    var t = 0.0;
    var steps = 0u;
    var hit = false;
    var lastDE: DEResult;
    let maxDist = 20.0;
    let maxSteps = 256u;
    let threshold = 0.0001;
    
    for (var step = 0u; step < maxSteps; step++) {
        let p = camPos + rayDir * t;
        lastDE = mandelbulb_de_full(p, power, params.maxIterations);
        
        steps = step;
        
        if (lastDE.distance < threshold) {
            hit = true;
            break;
        }
        
        t += lastDE.distance * 0.5;
        
        if (t > maxDist) {
            break;
        }
    }
    
    var color: vec4<f32>;
    
    if (hit) {
        let p = camPos + rayDir * t;
        
        // Color from distance and steps (distance estimation coloring)
        let paletteSize = arrayLength(&palette);
        let distFromOrigin = length(p);
        let stepFactor = f32(steps) / f32(maxSteps);
        var colorT = fract(distFromOrigin * 0.5 + stepFactor * 0.3 + lastDE.finalR * 0.2);
        var paletteIndex = u32(clamp(colorT * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        
        color = palette[paletteIndex];
    } else {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`,

    // NEW: Simple Shading Mode - Lambertian diffuse lighting
    mandelbulb_simpleshading: shaderCommon + `
// Mandelbulb distance estimator
struct DEResult {
    distance: f32,
    iterations: u32,
    finalR: f32,
}

fn mandelbulb_de_full(pos: vec3<f32>, power: f32, maxIter: u32) -> DEResult {
    var z = pos;
    var dr = 1.0;
    var r = 0.0;
    var result: DEResult;
    result.iterations = 0u;
    
    for (var i = 0u; i < maxIter; i++) {
        r = length(z);
        
        if (r > 2.0) {
            result.iterations = i;
            break;
        }
        
        // Convert to spherical coordinates
        var theta = acos(clamp(z.z / r, -1.0, 1.0));
        var phi = atan2(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        // Scale and rotate the point
        var zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        // Convert back to cartesian coordinates
        z = zr * vec3<f32>(
            sin(theta) * cos(phi),
            sin(phi) * sin(theta),
            cos(theta)
        );
        z = z + pos;
        
        result.iterations = i;
    }
    
    result.finalR = r;
    result.distance = 0.5 * log(r) * r / dr;
    return result;
}

// Calculate normal using central differences
fn calculateNormal(p: vec3<f32>, power: f32, maxIter: u32) -> vec3<f32> {
    let eps = 0.0001;
    let xp = mandelbulb_de_full(p + vec3<f32>(eps, 0.0, 0.0), power, maxIter).distance;
    let xn = mandelbulb_de_full(p - vec3<f32>(eps, 0.0, 0.0), power, maxIter).distance;
    let yp = mandelbulb_de_full(p + vec3<f32>(0.0, eps, 0.0), power, maxIter).distance;
    let yn = mandelbulb_de_full(p - vec3<f32>(0.0, eps, 0.0), power, maxIter).distance;
    let zp = mandelbulb_de_full(p + vec3<f32>(0.0, 0.0, eps), power, maxIter).distance;
    let zn = mandelbulb_de_full(p - vec3<f32>(0.0, 0.0, eps), power, maxIter).distance;
    
    return normalize(vec3<f32>(xp - xn, yp - yn, zp - zn));
}

// Ray marching with Simple Shading
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    // FPS Camera parameters
    let camPosX = params.centerX_hi;
    let camPosY = params.centerY_hi;
    let camPosZ = params.centerX_lo;
    let yaw = params.centerY_lo;
    let pitch = params.zoom;
    let fov = params.fieldOfView;
    let power = 8.0;
    
    // Calculate ray direction
    let aspect = f32(params.width) / f32(params.height);
    let uv = vec2<f32>(
        (f32(x) / f32(params.width) - 0.5) * aspect * fov,
        (f32(y) / f32(params.height) - 0.5) * fov
    );
    
    let cosYaw = cos(yaw);
    let sinYaw = sin(yaw);
    let cosPitch = cos(pitch);
    let sinPitch = sin(pitch);
    
    let forwardX = sinYaw * cosPitch;
    let forwardY = sinPitch;
    let forwardZ = -cosYaw * cosPitch;
    
    let rightX = cosYaw;
    let rightY = 0.0;
    let rightZ = sinYaw;
    
    let upX = rightY * forwardZ - rightZ * forwardY;
    let upY = rightZ * forwardX - rightX * forwardZ;
    let upZ = rightX * forwardY - rightY * forwardX;
    
    let rayDirX = forwardX + uv.x * rightX + uv.y * upX;
    let rayDirY = forwardY + uv.x * rightY + uv.y * upY;
    let rayDirZ = forwardZ + uv.x * rightZ + uv.y * upZ;
    
    let rayLength = sqrt(rayDirX * rayDirX + rayDirY * rayDirY + rayDirZ * rayDirZ);
    let rayDir = vec3<f32>(rayDirX / rayLength, rayDirY / rayLength, rayDirZ / rayLength);
    
    let camPos = vec3<f32>(camPosX, camPosY, camPosZ);
    
    // Ray march
    var t = 0.0;
    var steps = 0u;
    var hit = false;
    var lastDE: DEResult;
    let maxDist = 20.0;
    let maxSteps = 256u;
    let threshold = 0.0001;
    
    for (var step = 0u; step < maxSteps; step++) {
        let p = camPos + rayDir * t;
        lastDE = mandelbulb_de_full(p, power, params.maxIterations);
        
        steps = step;
        
        if (lastDE.distance < threshold) {
            hit = true;
            break;
        }
        
        t += lastDE.distance * 0.5;
        
        if (t > maxDist) {
            break;
        }
    }
    
    var color: vec4<f32>;
    
    if (hit) {
        let p = camPos + rayDir * t;
        let normal = calculateNormal(p, power, params.maxIterations);
        
        // Simple Lambertian shading with two lights
        let lightDir1 = normalize(vec3<f32>(1.0, 1.0, 1.0));
        let lightDir2 = normalize(vec3<f32>(-0.5, 0.5, -1.0));
        
        let diffuse1 = max(dot(normal, lightDir1), 0.0);
        let diffuse2 = max(dot(normal, lightDir2), 0.0);
        let ambient = 0.2;
        let intensity = clamp(ambient + diffuse1 * 0.7 + diffuse2, 0.0, 1.0);
        
        // Get base color from palette
        let paletteSize = arrayLength(&palette);
        let distFromOrigin = length(p);
        var colorT = fract(distFromOrigin * 0.5);
        var paletteIndex = u32(clamp(colorT * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        
        var baseColor = palette[paletteIndex];
        let finalColor = baseColor.rgb * intensity;
        
        color = vec4<f32>(finalColor, 1.0);
    } else {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`,

    // NEW: Ray Traced Mode - Ambient Occlusion and Soft Shadows
    mandelbulb_raytraced: shaderCommon + `
// Mandelbulb distance estimator
struct DEResult {
    distance: f32,
    iterations: u32,
    finalR: f32,
}

fn mandelbulb_de_full(pos: vec3<f32>, power: f32, maxIter: u32) -> DEResult {
    var z = pos;
    var dr = 1.0;
    var r = 0.0;
    var result: DEResult;
    result.iterations = 0u;
    
    for (var i = 0u; i < maxIter; i++) {
        r = length(z);
        
        if (r > 2.0) {
            result.iterations = i;
            break;
        }
        
        // Convert to spherical coordinates
        var theta = acos(clamp(z.z / r, -1.0, 1.0));
        var phi = atan2(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        // Scale and rotate the point
        var zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        // Convert back to cartesian coordinates
        z = zr * vec3<f32>(
            sin(theta) * cos(phi),
            sin(phi) * sin(theta),
            cos(theta)
        );
        z = z + pos;
        
        result.iterations = i;
    }
    
    result.finalR = r;
    result.distance = 0.5 * log(r) * r / dr;
    let pitch = params.zoom;
    let fov = params.fieldOfView;
    let power = 8.0;
    
    // Calculate ray direction
    let aspect = f32(params.width) / f32(params.height);
    let uv = vec2<f32>(
        (f32(x) / f32(params.width) - 0.5) * aspect * fov,
        (f32(y) / f32(params.height) - 0.5) * fov
    );
    
    let cosYaw = cos(yaw);
    let sinYaw = sin(yaw);
    let cosPitch = cos(pitch);
    let sinPitch = sin(pitch);
    
    let forwardX = sinYaw * cosPitch;
    let forwardY = sinPitch;
    let forwardZ = -cosYaw * cosPitch;
    
    let rightX = cosYaw;
    let rightY = 0.0;
    let rightZ = sinYaw;
    
    let upX = rightY * forwardZ - rightZ * forwardY;
    let upY = rightZ * forwardX - rightX * forwardZ;
    let upZ = rightX * forwardY - rightY * forwardX;
    
    let rayDirX = forwardX + uv.x * rightX + uv.y * upX;
    let rayDirY = forwardY + uv.x * rightY + uv.y * upY;
    let rayDirZ = forwardZ + uv.x * rightZ + uv.y * upZ;
    
    let rayLength = sqrt(rayDirX * rayDirX + rayDirY * rayDirY + rayDirZ * rayDirZ);
    let rayDir = vec3<f32>(rayDirX / rayLength, rayDirY / rayLength, rayDirZ / rayLength);
    
    let camPos = vec3<f32>(camPosX, camPosY, camPosZ);
    
    // Ray march
    var t = 0.0;
    var steps = 0u;
    var hit = false;
    var lastDE: DEResult;
    let maxDist = 20.0;
    let maxSteps = 256u;
    let threshold = 0.0001;
    
    for (var step = 0u; step < maxSteps; step++) {
        let p = camPos + rayDir * t;
        lastDE = mandelbulb_de_full(p, power, params.maxIterations);
        
        steps = step;
        
        if (lastDE.distance < threshold) {
            hit = true;
            break;
        }
        
        t += lastDE.distance * 0.5;
        
        if (t > maxDist) {
            break;
        }
    }
    
    var color: vec4<f32>;
    
    if (hit) {
        let p = camPos + rayDir * t;
        let normal = calculateNormal(p, power, params.maxIterations);
        
        // Calculate lighting
        let lightDir1 = normalize(vec3<f32>(1.0, 1.0, 1.0));
        let lightDir2 = normalize(vec3<f32>(-0.5, 0.5, -1.0));
        
        // Diffuse lighting
        let diffuse1 = max(dot(normal, lightDir1), 0.0);
        let diffuse2 = max(dot(normal, lightDir2), 0.0);
        
        // Soft shadows
        let shadow1 = softShadow(p + normal * 0.001, lightDir1, power, params.maxIterations);
        let shadow2 = softShadow(p + normal * 0.001, lightDir2, power, params.maxIterations);
        
        // Ambient occlusion
        let ao = calculateAO(p, normal, power, params.maxIterations);
        
        // Specular highlights
        let viewDir = -rayDir;
        let halfDir1 = normalize(lightDir1 + viewDir);
        let halfDir2 = normalize(lightDir2 + viewDir);
        let specular1 = pow(max(dot(normal, halfDir1), 0.0), 32.0);
        let specular2 = pow(max(dot(normal, halfDir2), 0.0), 32.0);
        
        // Combine lighting
        let ambient = 0.15;
        let light1 = (diffuse1 * shadow1 * 0.7 + specular1 * shadow1 * 0.3);
        let light2 = (diffuse2 * shadow2 * 0.4 + specular2 * shadow2 * 0.2);
        let intensity = clamp((ambient + light1 + light2) * ao, 0.0, 1.0);
        
        // Get base color from palette
        let paletteSize = arrayLength(&palette);
        let distFromOrigin = length(p);
        var colorT = fract(distFromOrigin * 0.5);
        var paletteIndex = u32(clamp(colorT * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        
        var baseColor = palette[paletteIndex];
        let finalColor = baseColor.rgb * intensity;
        
        color = vec4<f32>(finalColor, 1.0);
    } else {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`
};
