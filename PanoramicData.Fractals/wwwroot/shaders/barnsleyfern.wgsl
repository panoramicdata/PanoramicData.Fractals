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
