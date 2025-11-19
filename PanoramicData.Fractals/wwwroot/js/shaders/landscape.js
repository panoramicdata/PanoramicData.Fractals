// Landscape shader doesn't use palette - it has custom shader structure
export const landscapeShader = `
// Landscape-specific shader params (no palette)
struct FractalParams {
    width: u32,
    height: u32,
    centerX_hi: f32,
    centerX_lo: f32,
    centerY_hi: f32,
    centerY_lo: f32,
    zoom: f32,
    maxIterations: u32,
    fieldOfView: f32,
}

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> params: FractalParams;

// ============================================================================
// PROCEDURAL LANDSCAPE FRACTAL - MULTI-LAYER VERSION
// Features: Terrain (base), Water (layer 1), Roads (layer 2), Urban (layer 3), Clouds (layer 4 with height)
// Road system inspired by slime mold growth - organic branching paths
// ============================================================================

// Hash and noise functions
fn hash21(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3<f32>(p3.y, p3.z, p3.x) + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, vec3<f32>(p3.y, p3.z, p3.x) + 33.33);
    return fract(vec2<f32>((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y));
}

fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    
    let a = hash21(i);
    let b = hash21(i + vec2<f32>(1.0, 0.0));
    let c = hash21(i + vec2<f32>(0.0, 1.0));
    let d = hash21(i + vec2<f32>(1.0, 1.0));
    
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

fn fbm(p: vec2<f32>, octaves: i32) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    var pp = p;
    
    for (var i = 0; i < octaves; i++) {
        value += amplitude * noise(pp * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// LAYER 0: TERRAIN (Base layer)
fn getTerrainHeight(p: vec2<f32>) -> f32 {
    let mountains = fbm(p * 0.3, 6) * 2.0;
    let hills = fbm(p * 1.5, 4) * 0.5;
    let details = fbm(p * 5.0, 3) * 0.1;
    
    return mountains + hills + details;
}

fn getTerrainGradient(p: vec2<f32>) -> f32 {
    let epsilon = 0.02;
    let h = getTerrainHeight(p);
    let hx = getTerrainHeight(p + vec2<f32>(epsilon, 0.0));
    let hy = getTerrainHeight(p + vec2<f32>(0.0, epsilon));
    
    let grad = vec2<f32>((hx - h) / epsilon, (hy - h) / epsilon);
    return length(grad);
}

fn getTerrainFlatness(p: vec2<f32>) -> f32 {
    let slope = getTerrainGradient(p);
    return 1.0 - clamp(slope * 5.0, 0.0, 1.0);
}

fn getTerrainColor(height: f32, flatness: f32) -> vec3<f32> {
    if (height < 0.15) {
        return vec3<f32>(0.05, 0.15, 0.35);
    }
    if (height < 0.3) {
        return mix(vec3<f32>(0.05, 0.15, 0.35), vec3<f32>(0.2, 0.4, 0.6), (height - 0.15) / 0.15);
    }
    if (height < 0.35) {
        return vec3<f32>(0.85, 0.75, 0.55);
    }
    if (height < 0.5) {
        return vec3<f32>(0.2, 0.65, 0.15);
    }
    if (height < 0.8) {
        let grassColor = vec3<f32>(0.35, 0.6, 0.2);
        let dirtColor = vec3<f32>(0.55, 0.45, 0.3);
        return mix(grassColor, dirtColor, 1.0 - flatness);
    }
    if (height < 1.2) {
        return mix(vec3<f32>(0.45, 0.4, 0.35), vec3<f32>(0.3, 0.28, 0.25), (height - 0.8) / 0.4);
    }
    if (height < 1.5) {
        return vec3<f32>(0.5, 0.5, 0.5);
    }
    return vec3<f32>(0.95, 0.95, 1.0);
}

// LAYER 1: WATER
fn getWaterMask(p: vec2<f32>) -> f32 {
    let h = getTerrainHeight(p);
    let lakeNoise = fbm(p * 0.2 + vec2<f32>(200.0, 100.0), 4);
    let lakePattern = smoothstep(0.55, 0.65, lakeNoise);
    let heightFactor = smoothstep(0.5, 0.2, h);
    return lakePattern * heightFactor;
}

fn getRiverMask(p: vec2<f32>) -> f32 {
    let riverNoise = abs(fbm(p * 0.5 + vec2<f32>(100.0, 50.0), 4) - 0.5) * 2.0;
    let riverWidth = 0.08;
    let h = getTerrainHeight(p);
    let heightOk = smoothstep(0.6, 0.3, h);
    
    if (riverNoise < riverWidth && heightOk > 0.3) {
        return (1.0 - (riverNoise / riverWidth)) * heightOk;
    }
    return 0.0;
}

fn getWaterColor(intensity: f32) -> vec3<f32> {
    let shallowColor = vec3<f32>(0.25, 0.7, 0.75);
    let deepColor = vec3<f32>(0.05, 0.25, 0.55);
    return mix(shallowColor, deepColor, intensity);
}

// LAYER 2: VEGETATION
fn getTreeDensity(p: vec2<f32>) -> f32 {
    let water = max(getWaterMask(p), getRiverMask(p));
    if (water > 0.3) {
        return 0.0;
    }
    
    let height = getTerrainHeight(p);
    let flatness = getTerrainFlatness(p);
    
    let altitudeFactor = 1.0 - abs(height - 0.7) / 0.7;
    let slopeFactor = mix(0.3, 1.0, flatness);
    let treeDensity = altitudeFactor * slopeFactor;
    let treeNoise = fbm(p * 10.0, 3);
    
    return clamp(treeDensity * treeNoise, 0.0, 1.0);
}

// LAYER 3: URBAN CENTERS (for road destinations)
fn getUrbanDensity(p: vec2<f32>) -> f32 {
    let water = max(getWaterMask(p), getRiverMask(p));
    if (water > 0.3) {
        return 0.0;
    }
    
    let centerNoise = fbm(p * 0.08, 3); // Sparser cities
    let urbanThreshold = 0.68; // Higher threshold = fewer cities
    
    if (centerNoise > urbanThreshold) {
        let centerDist = (centerNoise - urbanThreshold) * 6.0;
        return clamp(centerDist, 0.0, 1.0);
    }
    return 0.0;
}

fn getCityCenter(gridPos: vec2<f32>) -> vec2<f32> {
    // Deterministic city center based on grid position
    let offset = hash22(gridPos * 456.789);
    return gridPos + offset * 0.8 + 0.1; // Keep cities within grid cells
}

// LAYER 4: ROAD NETWORK (Slime mold inspired - organic branching)
struct RoadResult {
    highway: f32,  // Major highways (red-orange)
    arterial: f32, // Medium roads (orange-yellow)
    local: f32,    // Small local roads (yellow)
}

fn getRoadNetwork(p: vec2<f32>) -> RoadResult {
    var result: RoadResult;
    result.highway = 0.0;
    result.arterial = 0.0;
    result.local = 0.0;
    
    let water = max(getWaterMask(p), getRiverMask(p));
    if (water > 0.3) {
        return result;
    }
    
    let gradient = getTerrainGradient(p);
    if (gradient > 0.5) {
        return result; // No roads on very steep terrain
    }
    
    let citySpacing = 4.0;
    let gridPos = floor(p / citySpacing);
    
    // Find nearest cities for road connections
    var nearestCityDist = 999.0;
    var nearestCityPos = vec2<f32>(0.0, 0.0);
    var secondNearestDist = 999.0;
    var cityCount = 0;
    
    for (var dx = -2; dx <= 2; dx++) {
        for (var dy = -2; dy <= 2; dy++) {
            let testGrid = gridPos + vec2<f32>(f32(dx), f32(dy));
            let cityNoise = hash21(testGrid * 123.456);
            
            if (cityNoise > 0.65) { // Sparser cities
                let cityCenter = getCityCenter(testGrid) * citySpacing;
                let dist = length(p - cityCenter);
                
                cityCount++;
                
                if (dist < nearestCityDist) {
                    secondNearestDist = nearestCityDist;
                    nearestCityDist = dist;
                    nearestCityPos = cityCenter;
                } else if (dist < secondNearestDist) {
                    secondNearestDist = dist;
                }
            }
        }
    }
    
    // HIGHWAY NETWORK: Connects cities but BYPASSES them (stays outside)
    if (cityCount >= 2) {
        // Distance to nearest city edge (not center)
        let cityRadius = 0.4;
        let distToCity = max(nearestCityDist - cityRadius, 0.0);
        
        // Highways form between cities, avoiding centers
        let betweenCities = smoothstep(0.8, 0.3, abs(nearestCityDist - secondNearestDist));
        
        // Highway only if we're OUTSIDE city centers
        if (nearestCityDist > cityRadius * 1.2) {
            let highwayNoise = fbm(p * 0.3, 2);
            let highwayPath = smoothstep(0.5, 0.48, highwayNoise);
            
            result.highway = highwayPath * betweenCities * (1.0 - gradient);
        }
    }
    
    // ARTERIAL ROADS: Connect to city edges from highways
    if (nearestCityDist < 2.0 && nearestCityDist > 0.3) {
        let dirToCity = normalize(nearestCityPos - p);
        let roadNoise = fbm(p * 0.8, 2);
        let alignment = abs(dot(dirToCity, normalize(vec2<f32>(cos(roadNoise), sin(roadNoise)))));
        
        result.arterial = smoothstep(0.7, 0.9, alignment) * smoothstep(2.0, 0.5, nearestCityDist);
    }
    
    // LOCAL ROADS: Within and near cities
    if (nearestCityDist < 0.8) {
        let localGrid = fract(p * 8.0);
        let localRoadWidth = 0.08;
        
        if (localGrid.x < localRoadWidth || localGrid.y < localRoadWidth) {
            result.local = smoothstep(0.8, 0.2, nearestCityDist);
        }
    }
    
    return result;
}

// LAYER 5: BUILDINGS
fn getBuildingMask(p: vec2<f32>) -> f32 {
    let water = max(getWaterMask(p), getRiverMask(p));
    if (water > 0.3) {
        return 0.0;
    }
    
    let urbanDensity = getUrbanDensity(p);
    let flatness = getTerrainFlatness(p);
    let height = getTerrainHeight(p);
    
    var buildingProbability = urbanDensity * flatness * 0.6;
    
    if (height > 1.5 || height < 0.2) {
        return 0.0;
    }
    
    let buildingNoise = hash21(floor(p * 5.0));
    
    if (buildingNoise < buildingProbability) {
        return hash21(floor(p * 5.0) + vec2<f32>(1.0, 1.0));
    }
    
    return 0.0;
}

// LAYER 6: CLOUDS (with variable height/thickness)
struct CloudLayer {
    coverage: f32,
    thickness: f32, // 0-1, higher = thicker/darker clouds
}

fn getCloudLayer(p: vec2<f32>) -> CloudLayer {
    var cloud: CloudLayer;
    
    // Base cloud coverage
    let cloudNoise = fbm(p * 0.6 + vec2<f32>(50.0, 50.0), 5);
    cloud.coverage = smoothstep(0.4, 0.7, cloudNoise);
    
    // Cloud thickness varies with secondary noise
    let thicknessNoise = fbm(p * 1.2 + vec2<f32>(25.0, 75.0), 3);
    cloud.thickness = smoothstep(0.3, 0.8, thicknessNoise);
    
    return cloud;
}

// Main compute shader - COMPOSITING LAYERS
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    let aspect = f32(params.width) / f32(params.height);
    let scale = 10.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale * aspect;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    let worldPos = vec2<f32>(
        params.centerX_hi + pixel_offset_x,
        params.centerY_hi + pixel_offset_y
    );
    
    // SAMPLE ALL LAYERS
    let terrainHeight = getTerrainHeight(worldPos);
    let flatness = getTerrainFlatness(worldPos);
    let waterMask = getWaterMask(worldPos);
    let riverMask = getRiverMask(worldPos);
    let treeDensity = getTreeDensity(worldPos);
    let roads = getRoadNetwork(worldPos);
    let buildingMask = getBuildingMask(worldPos);
    let urbanDensity = getUrbanDensity(worldPos);
    let clouds = getCloudLayer(worldPos);
    
    // LAYER COMPOSITING (back to front)
    
    // Start with terrain
    var finalColor = getTerrainColor(terrainHeight, flatness);
    
    // Layer: Trees
    if (treeDensity > 0.3 && waterMask < 0.3 && riverMask < 0.3) {
        let treeColor = vec3<f32>(0.08, 0.4, 0.08);
        finalColor = mix(finalColor, treeColor, treeDensity * 0.8);
    }
    
    // Layer: Water (covers terrain)
    if (waterMask > 0.3) {
        let waterColor = getWaterColor(waterMask);
        finalColor = waterColor;
    } else if (riverMask > 0.3) {
        let riverColor = vec3<f32>(0.2, 0.6, 0.9);
        finalColor = mix(finalColor, riverColor, riverMask);
    }
    
    let isWater = max(waterMask, riverMask);
    
    // Layer: Roads (separate layer, drawn AFTER water)
    if (isWater < 0.3) {
        // Highway: Dark red-orange (largest, bypasses cities)
        if (roads.highway > 0.4) {
            let highwayColor = vec3<f32>(0.8, 0.2, 0.1); // Dark red
            finalColor = mix(finalColor, highwayColor, roads.highway * 0.95);
        }
        // Arterial: Orange-red (medium, connects to cities)
        else if (roads.arterial > 0.3) {
            let arterialColor = vec3<f32>(0.85, 0.4, 0.15); // Orange
            finalColor = mix(finalColor, arterialColor, roads.arterial * 0.9);
        }
        // Local: Yellow-orange (small, within cities)
        else if (roads.local > 0.2) {
            let localColor = vec3<f32>(0.9, 0.7, 0.2); // Yellow-orange
            finalColor = mix(finalColor, localColor, roads.local * 0.85);
        }
    }
    
    // Layer: Buildings
    if (buildingMask > 0.0 && isWater < 0.3) {
        let buildingNoise = hash21(floor(worldPos * 5.0));
        let buildingColor = mix(
            vec3<f32>(0.7, 0.6, 0.45),
            vec3<f32>(0.75, 0.75, 0.75),
            buildingNoise
        );
        finalColor = mix(finalColor, buildingColor, buildingMask * 0.85);
    }
    
    // Layer: Urban density overlay
    if (urbanDensity > 0.1 && isWater < 0.3) {
        let urbanColor = vec3<f32>(0.45, 0.45, 0.45);
        finalColor = mix(finalColor, urbanColor, urbanDensity * 0.25);
    }
    
    // Lighting (before clouds)
    let lightDir = normalize(vec3<f32>(1.0, 1.0, 0.6));
    let epsilon = 0.01;
    let hx = getTerrainHeight(worldPos + vec2<f32>(epsilon, 0.0));
    let hy = getTerrainHeight(worldPos + vec2<f32>(0.0, epsilon));
    let normal = normalize(vec3<f32>(
        (terrainHeight - hx) / epsilon,
        (terrainHeight - hy) / epsilon,
        1.0
    ));
    
    let lighting = mix(
        max(dot(normal, lightDir), 0.25),
        0.8,
        clamp(isWater, 0.0, 1.0)
    );
    finalColor *= lighting;
    
    // Water shimmer
    if (isWater > 0.3) {
        let shimmer = hash21(worldPos * 50.0) * 0.2;
        finalColor += vec3<f32>(shimmer, shimmer * 1.1, shimmer * 0.9);
    }
    
    // Layer: Clouds (top layer with variable thickness)
    if (clouds.coverage > 0.3) {
        // Cloud color varies by thickness: thin=white, thick=gray
        let thinCloudColor = vec3<f32>(1.0, 1.0, 1.0);
        let thickCloudColor = vec3<f32>(0.6, 0.6, 0.65);
        let cloudColor = mix(thinCloudColor, thickCloudColor, clouds.thickness);
        
        // Alpha based on coverage and thickness
        let cloudAlpha = clouds.coverage * mix(0.3, 0.7, clouds.thickness);
        finalColor = mix(finalColor, cloudColor, cloudAlpha);
    }
    
    finalColor = clamp(finalColor, vec3<f32>(0.0), vec3<f32>(1.0));
    let color = vec4<f32>(finalColor, 1.0);
    
    textureStore(outputTexture, vec2<i32>(i32(x), i32(y)), color);
}
`;
