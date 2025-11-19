import { shaderCommon } from '../shader-common.js';

export const mandelbulbShader = shaderCommon + `
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

// Ray marching with FPS camera and FOV zoom
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    // FPS Camera parameters from uniforms
    let camPosX = params.centerX_hi;
    let camPosY = params.centerY_hi;
    let camPosZ = params.centerX_lo;
    let yaw = params.centerY_lo;
    let pitch = params.zoom;
    let fov = params.fieldOfView;
    let power = 8.0;
    
    // Normalized screen coordinates WITH FOV SCALING
    let aspect = f32(params.width) / f32(params.height);
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
    
    // Camera up direction
    let upX = rightY * forwardZ - rightZ * forwardY;
    let upY = rightZ * forwardX - rightX * forwardZ;
    let upZ = rightX * forwardY - rightY * forwardX;
    
    // Ray direction
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
        
        // Color from distance and steps
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
`;
