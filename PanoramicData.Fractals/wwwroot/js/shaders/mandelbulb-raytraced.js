import { shaderCommon } from '../shader-common.js';

export const mandelbulbRaytracedShader = shaderCommon + `
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

// Calculate normal
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

// Ambient Occlusion
fn calculateAO(p: vec3<f32>, normal: vec3<f32>, power: f32, maxIter: u32) -> f32 {
    var occlusion = 0.0;
    var scale = 1.0;
    
    for (var i = 0u; i < 5u; i++) {
        let h = 0.01 + 0.12 * f32(i) / 4.0;
        let d = mandelbulb_de_full(p + normal * h, power, maxIter).distance;
        occlusion += (h - d) * scale;
        scale *= 0.95;
    }
    
    return clamp(1.0 - 3.0 * occlusion, 0.0, 1.0);
}

// Soft shadows
fn softShadow(p: vec3<f32>, lightDir: vec3<f32>, power: f32, maxIter: u32) -> f32 {
    var res = 1.0;
    var t = 0.02;
    
    for (var i = 0u; i < 16u; i++) {
        let h = mandelbulb_de_full(p + lightDir * t, power, maxIter).distance;
        if (h < 0.001) {
            return 0.0;
        }
        res = min(res, 8.0 * h / t);
        t += h;
        if (t > 2.5) {
            break;
        }
    }
    
    return clamp(res, 0.0, 1.0);
}

// Environment/Ambient lighting - gradient from top to bottom
fn getEnvironmentColor(dir: vec3<f32>) -> vec3<f32> {
    // Vertical gradient: dark gray at bottom, light at top
    let t = dir.y * 0.5 + 0.5; // Map -1..1 to 0..1
    let skyColor = vec3<f32>(0.8, 0.85, 0.9);   // Light blue-gray sky
    let groundColor = vec3<f32>(0.15, 0.15, 0.2); // Dark blue-gray ground
    return mix(groundColor, skyColor, t);
}

// Ray marching with Advanced Lighting
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
        
        // Environment lighting (reflection)
        let reflectDir = reflect(rayDir, normal);
        let envColor = getEnvironmentColor(reflectDir);
        
        // Get base color from palette
        let paletteSize = arrayLength(&palette);
        let distFromOrigin = length(p);
        var colorT = fract(distFromOrigin * 0.5);
        var paletteIndex = u32(clamp(colorT * f32(paletteSize - 1u), 0.0, f32(paletteSize - 1u)));
        var baseColor = palette[paletteIndex];
        
        // Combine all lighting
        let directLight1 = (diffuse1 * shadow1 * 0.7 + specular1 * shadow1 * 0.3);
        let directLight2 = (diffuse2 * shadow2 * 0.4 + specular2 * shadow2 * 0.2);
        let ambientLight = envColor * ao * 0.3; // Environment contribution
        
        let litColor = baseColor.rgb * (directLight1 + directLight2) + ambientLight * baseColor.rgb;
        let finalColor = clamp(litColor, vec3<f32>(0.0), vec3<f32>(1.0));
        
        color = vec4<f32>(finalColor, 1.0);
    } else {
        // Render environment when ray misses
        let envColor = getEnvironmentColor(rayDir);
        color = vec4<f32>(envColor, 1.0);
    }
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`;
