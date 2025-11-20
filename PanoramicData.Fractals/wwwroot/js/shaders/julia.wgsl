@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;

    if (x >= params.width || y >= params.height) {
        return;
    }

    let aspect = f32(params.width) / f32(params.height);
    let scale = 4.0 / params.zoom;

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
