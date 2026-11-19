# Landscape Fractal - Technical Documentation

## Overview
The Landscape fractal is a comprehensive procedural generation system that creates realistic terrain with urban development, natural features, and infrastructure. It demonstrates advanced procedural techniques and clustering algorithms.

## Features

### 1. **Terrain Generation**
- Multi-scale terrain using Fractal Brownian Motion (fBm)
- Mountains, hills, and fine details at different octaves
- Realistic elevation gradients

### 2. **Water Systems**
- Rivers following natural valley patterns
- Uses ridged noise for realistic river placement
- Rivers avoid high elevations naturally

### 3. **Urban Centers**
- Clustered city placement using threshold-based noise
- Urban density falls off with distance from centers
- Multiple independent urban centers across the map

### 4. **Road Network**
- Grid-based streets within urban areas
- Grid density increases with urban density
- Highway system connecting urban centers
- Roads follow terrain constraints

### 5. **Buildings**
- Placement based on multiple factors:
  - **Flatness**: Buildings prefer flat terrain
  - **Urban Density**: More buildings in urban centers
  - **Road Proximity**: Buildings cluster near roads
  - **Water Avoidance**: No buildings in rivers
  - **Altitude Constraints**: Reasonable elevation ranges
- Varying building heights for realism

### 6. **Forests & Trees**
- Tree density based on:
  - Low urban density (avoid cities)
  - Medium altitude preference
  - Proximity to water
  - Terrain slope (prefer moderate slopes)
- Procedural forest patterns using noise

### 7. **Cloud Layer**
- Independent cloud coverage
- Perlin noise based atmospheric effects
- Translucent overlay

### 8. **Lighting**
- Simple directional lighting based on terrain normals
- Shadows from elevation changes
- Ambient occlusion for depth

## Procedural Generation Techniques

### Noise Functions
```wgsl
// Hash functions for random number generation
fn hash21(p: vec2<f32>) -> f32
fn hash22(p: vec2<f32>) -> vec2<f32>

// Value noise
fn noise(p: vec2<f32>) -> f32

// Fractal Brownian Motion
fn fbm(p: vec2<f32>, octaves: i32) -> f32
```

### Clustering Algorithm
Urban centers use threshold-based clustering:
1. Sample noise at low frequency (0.1)
2. Apply threshold (0.65) to create distinct regions
3. Calculate density falloff from center
4. Use density for subsequent feature placement

### Building Placement Logic
```wgsl
Building Probability = 
    UrbanDensity × Flatness × 0.5
    × (1 + RoadProximityBonus)
    × (1 - RiverPenalty)
    × AltitudeConstraint
    × RandomNoise
```

### Road Network Algorithm
1. **Urban Grid**: 
   - Grid size inversely proportional to density
   - Smaller grids in denser areas
   - 5% road width

2. **Highways**:
   - Fixed frequency (0.3)
   - Connect across map
   - 2% width

### Tree Distribution
```wgsl
TreeDensity = 
    AltitudeFactor (prefer mid-elevation)
    × SlopeFactor (prefer moderate slopes)
    × (1 - UrbanDensity) (avoid cities)
    × NoisePattern (natural clustering)
```

## Color Scheme

### Terrain
- **Water**: Deep blue (0.1, 0.2, 0.4) → Light blue (0.2, 0.4, 0.6)
- **Beach**: Sand (0.8, 0.7, 0.5)
- **Grass**: Green (0.3, 0.6, 0.2)
- **Rock**: Gray (0.5, 0.5, 0.5) → Dark gray (0.3, 0.3, 0.3)
- **Snow**: White (0.9, 0.9, 1.0)

### Features
- **Rivers**: Blue (0.2, 0.4, 0.7)
- **Roads**: Gray (0.3, 0.3, 0.3)
- **Buildings**: Beige (0.6, 0.5, 0.4) → Gray (0.7, 0.7, 0.7)
- **Trees**: Dark green (0.1, 0.4, 0.1)
- **Clouds**: White (1.0, 1.0, 1.0) with transparency

## Performance Optimizations

1. **Single-pass rendering**: All features computed in one shader pass
2. **Efficient noise**: Simple hash-based noise functions
3. **Octave control**: Balanced detail vs performance (3-6 octaves)
4. **Early termination**: Skip calculations for non-visible features
5. **GPU parallelism**: 8×8 workgroup size for optimal GPU utilization

## Usage

### Controls
- **Zoom**: Mouse wheel or pinch to zoom in/out
- **Pan**: Click and drag or touch and drag
- **View entire world**: Reset button or zoom out far

### Exploration Tips
1. **Zoom out** to see overall terrain structure
2. **Zoom in on urban areas** to see building details
3. **Follow rivers** to see how they connect regions
4. **Examine road networks** in cities vs highways
5. **Look for forests** near water at mid-elevations

## Parameters

### Tunable Constants
```wgsl
// Terrain
MOUNTAIN_SCALE = 0.3
HILL_SCALE = 1.5
DETAIL_SCALE = 5.0

// Urban
URBAN_THRESHOLD = 0.65
GRID_SIZE_RANGE = 0.3 to 1.0
ROAD_WIDTH = 0.05

// Rivers
RIVER_WIDTH = 0.15
RIVER_ALTITUDE_MAX = 0.5

// Trees
TREE_ALTITUDE_OPTIMAL = 0.7
TREE_NOISE_SCALE = 10.0

// Clouds
CLOUD_SCALE = 0.8
CLOUD_THRESHOLD = 0.4 to 0.7
```

## Future Enhancements

### Potential Additions
1. **Seasonal variation**: Different colors for seasons
2. **Time of day**: Dynamic lighting
3. **Weather effects**: Rain, snow visualization
4. **Coastal features**: Beaches, harbors, ports
5. **Mountain features**: Peaks, ridges, valleys
6. **Road curvature**: Follow terrain contours
7. **Building types**: Residential, commercial, industrial
8. **Farmland**: Agricultural patterns
9. **Lakes and ponds**: Inland water bodies
10. **Erosion patterns**: Realistic geological features

### Advanced Features
- **LOD system**: Different detail levels at different zoom levels
- **Biome system**: Desert, forest, tundra regions
- **Historical growth**: Simulate city expansion over time
- **Economic simulation**: Resource-driven development
- **Transportation networks**: Railways, airports

## Technical Details

### Shader Structure
```
landscape.js
├─ Noise Functions (hash, value noise, fbm)
├─ Terrain Generation (getTerrainHeight, getTerrainFlatness)
├─ Urban Systems (getUrbanDensity, getRoadMask, getBuildingMask)
├─ Natural Features (getRiverMask, getTreeDensity)
├─ Atmospheric (getCloudCover)
├─ Rendering (getTerrainColor, lighting)
└─ Main Compute Shader (compositing all layers)
```

### Data Flow
1. Calculate world position from pixel coordinates
2. Sample terrain height and features
3. Apply clustering algorithms for urban centers
4. Place roads based on urban density
5. Place buildings based on constraints
6. Add natural features (trees, rivers)
7. Apply atmospheric effects (clouds)
8. Composite all layers with priorities
9. Apply lighting
10. Output final color

## Comparison to Mathematical Fractals

| Aspect | Mathematical Fractals | Landscape Fractal |
|--------|----------------------|-------------------|
| **Purpose** | Aesthetic, mathematical exploration | Realistic world simulation |
| **Computation** | Iterative escape-time | Noise sampling + rules |
| **Features** | Self-similar patterns | Varied, rule-based features |
| **Zoom behavior** | Infinite detail | Finite detail, optimized for viewing scale |
| **Color** | Palette-based on iterations | Material-based (terrain types) |
| **Complexity** | Mathematical | Procedural + Simulation |

## Conclusion

The Landscape fractal demonstrates how procedural generation can create complex, realistic worlds through:
- **Layered systems**: Terrain, water, urban, natural
- **Smart placement**: Rule-based feature distribution
- **Clustering**: Realistic city and forest patterns
- **Performance**: GPU-accelerated single-pass rendering

This serves as a foundation for more advanced procedural world generation systems, game environments, and simulation visualizations.
