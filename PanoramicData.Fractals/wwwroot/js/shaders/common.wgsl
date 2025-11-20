// Common shader code shared by all fractals

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
    fieldOfView: f32,  // Field of View for 3D camera zoom
}

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> params: FractalParams;
@group(0) @binding(2) var<storage, read> palette: array<vec4<f32>>;
