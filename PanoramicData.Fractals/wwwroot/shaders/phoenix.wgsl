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
