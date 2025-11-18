// WebGPU state
let device = null;
let context = null;
let canvas = null;
let renderPipeline = null;
let computePipeline = null;
let outputTexture = null;
let uniformBuffer = null;
let paletteBuffer = null;
let computeBindGroup = null;
let renderBindGroup = null;
let presentationFormat = null;

// Interaction state
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let interactionCallback = null;

// Check if WebGPU is supported
export function isWebGPUSupported() {
    const supported = navigator.gpu !== undefined;
    console.log('WebGPU support check:', supported);
    return supported;
}

// Get window dimensions with 1:1 aspect ratio (square canvas)
export function getCanvasSize() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // Use the smaller dimension to maintain 1:1 aspect ratio
    const size = Math.min(containerWidth, containerHeight);

    return {
        width: size,
        height: size
    };
}

// Setup mouse/touch interaction handlers
export function setupInteraction(dotNetHelper) {
    if (!canvas) {
        console.error('Canvas not initialized');
        return;
    }

    interactionCallback = dotNetHelper;

    // Mouse down - start panning
    canvas.addEventListener('mousedown', (e) => {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.preventDefault();
    });

    // Mouse move - pan the view
    canvas.addEventListener('mousemove', async (e) => {
        if (!isPanning) return;

        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // Notify Blazor component of pan
        await interactionCallback.invokeMethodAsync('OnPan', deltaX, deltaY);
    });

    // Mouse up - stop panning
    const stopPanning = () => {
        isPanning = false;
    };
    canvas.addEventListener('mouseup', stopPanning);
    canvas.addEventListener('mouseleave', stopPanning);

    // Mouse wheel - zoom
    canvas.addEventListener('wheel', async (e) => {
        e.preventDefault();

        // Calculate zoom delta (negative for zoom in, positive for zoom out)
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1; // 10% zoom steps

        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Normalize to 0-1 range
        const normalizedX = mouseX / canvas.width;
        const normalizedY = mouseY / canvas.height;

        // Notify Blazor component of zoom
        await interactionCallback.invokeMethodAsync('OnZoom', zoomDelta, normalizedX, normalizedY);
    }, { passive: false });

    // Touch support
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartDist = 0;

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();

        if (e.touches.length === 1) {
            // Single touch - pan
            isPanning = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Two touches - zoom
            isPanning = false;
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            touchStartDist = Math.sqrt(dx * dx + dy * dy);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', async (e) => {
        e.preventDefault();

        if (e.touches.length === 1 && isPanning) {
            // Pan
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;

            await interactionCallback.invokeMethodAsync('OnPan', deltaX, deltaY);
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            const currentDist = Math.sqrt(dx * dx + dy * dy);

            if (touchStartDist > 0) {
                const zoomDelta = currentDist / touchStartDist;

                // Get center point between touches
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                const rect = canvas.getBoundingClientRect();
                const normalizedX = (centerX - rect.left) / canvas.width;
                const normalizedY = (centerY - rect.top) / canvas.height;

                await interactionCallback.invokeMethodAsync('OnZoom', zoomDelta, normalizedX, normalizedY);
            }

            touchStartDist = currentDist;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        isPanning = false;
        touchStartDist = 0;
    });
}

// Remove interaction handlers
export function removeInteraction() {
    if (canvas) {
        // Remove all event listeners by cloning the canvas
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);
        canvas = newCanvas;
    }
    interactionCallback = null;
}

// Initialize WebGPU
export async function initialize(canvasId) {
    try {
        console.log('Starting WebGPU initialization...');

        if (!navigator.gpu) {
            console.error('WebGPU is not supported in this browser');
            return false;
        }

        // Get canvas
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return false;
        }
        console.log('Canvas found:', canvas);

        // Request adapter and device
        console.log('Requesting GPU adapter...');
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.error('Failed to get GPU adapter');
            return false;
        }
        console.log('GPU adapter obtained:', adapter);

        console.log('Requesting GPU device...');
        device = await adapter.requestDevice();
        console.log('GPU device obtained:', device);

        // Configure canvas context
        context = canvas.getContext('webgpu');
        presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        console.log('Configuring canvas context with format:', presentationFormat);
        context.configure({
            device: device,
            format: presentationFormat,
            alphaMode: 'opaque',
        });

        // Create render pipeline
        console.log('Creating render pipeline...');
        await createRenderPipeline();

        console.log('WebGPU initialized successfully');
        return true;
    } catch (error) {
        console.error('WebGPU initialization error:', error);
        return false;
    }
}

// Mandelbrot compute shader with emulated double precision (WGSL)
const mandelbrotShader = `
struct FractalParams {
    width: u32,
    height: u32,
    centerX_hi: f32,  // High part of double
    centerX_lo: f32,  // Low part of double
    centerY_hi: f32,
    centerY_lo: f32,
    zoom: f32,
    maxIterations: u32,
}

@group(0) @binding(0) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> params: FractalParams;
@group(0) @binding(2) var<storage, read> palette: array<vec4<f32>>;

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

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.width || y >= params.height) {
        return;
    }
    
    // Map pixel to complex plane using double-double precision
    let scale = 4.0 / params.zoom;
    let pixel_offset_x = (f32(x) / f32(params.width) - 0.5) * scale;
    let pixel_offset_y = (f32(y) / f32(params.height) - 0.5) * scale;
    
    // Add offset to center coordinates using double-double arithmetic
    let real_dd = add_dd(params.centerX_hi, params.centerX_lo, pixel_offset_x, 0.0);
    let imag_dd = add_dd(params.centerY_hi, params.centerY_lo, pixel_offset_y, 0.0);
    
    // Mandelbrot iteration with double-double precision
    var zr_dd = to_dd(0.0);
    var zi_dd = to_dd(0.0);
    var iter = 0u;
    
    for (var i = 0u; i < params.maxIterations; i = i + 1u) {
        // Calculate zr^2 and zi^2
        let zr2_dd = mul_dd(zr_dd.x, zr_dd.y, zr_dd.x, zr_dd.y);
        let zi2_dd = mul_dd(zi_dd.x, zi_dd.y, zi_dd.x, zi_dd.y);
        
        // Check escape condition (magnitude squared > 4)
        let mag_sq = zr2_dd.x + zi2_dd.x;
        if (mag_sq > 4.0) {
            iter = i;
            break;
        }
        
        // Calculate 2 * zr * zi
        let two_zr_dd = vec2<f32>(zr_dd.x * 2.0, zr_dd.y * 2.0);
        let zr_zi_dd = mul_dd(two_zr_dd.x, two_zr_dd.y, zi_dd.x, zi_dd.y);
        
        // Calculate new zi = 2*zr*zi + imag
        let new_zi_dd = add_dd(zr_zi_dd.x, zr_zi_dd.y, imag_dd.x, imag_dd.y);
        
        // Calculate new zr = zr^2 - zi^2 + real
        let zr2_minus_zi2_dd = add_dd(zr2_dd.x, zr2_dd.y, -zi2_dd.x, -zi2_dd.y);
        let new_zr_dd = add_dd(zr2_minus_zi2_dd.x, zr2_minus_zi2_dd.y, real_dd.x, real_dd.y);
        
        zr_dd = new_zr_dd;
        zi_dd = new_zi_dd;
        
        iter = i;
    }
    
    // Color based on iteration count with smooth coloring
    var color: vec4<f32>;
    if (iter >= params.maxIterations - 1u) {
        color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    } else {
        // Smooth coloring using continuous escape time
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
`;

// Fullscreen quad vertex shader
const vertexShader = `
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) texCoord: vec2<f32>,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    
    // Fullscreen triangle
    let x = f32((vertexIndex & 1u) << 2u) - 1.0;
    let y = f32((vertexIndex & 2u) << 1u) - 1.0;
    
    output.position = vec4<f32>(x, y, 0.0, 1.0);
    output.texCoord = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    
    return output;
}
`;

// Fragment shader to display the texture
const fragmentShader = `
@group(0) @binding(0) var outputTexture: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;

@fragment
fn main(@location(0) texCoord: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(outputTexture, texSampler, texCoord);
}
`;

// Create render pipeline for displaying the computed texture
async function createRenderPipeline() {
    const vertexModule = device.createShaderModule({
        code: vertexShader,
    });

    const fragmentModule = device.createShaderModule({
        code: fragmentShader,
    });

    renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: vertexModule,
            entryPoint: 'main',
        },
        fragment: {
            module: fragmentModule,
            entryPoint: 'main',
            targets: [{
                format: presentationFormat,
            }],
        },
        primitive: {
            topology: 'triangle-list',
        },
    });
}

// Create compute pipeline for fractals
async function createComputePipeline() {
    const shaderModule = device.createShaderModule({
        code: mandelbrotShader,
    });

    computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: shaderModule,
            entryPoint: 'main',
        },
    });
}

// Render fractal
export async function renderFractal(
    fractalType,
    centerX,
    centerY,
    zoom,
    width,
    height,
    maxIterations,
    paletteData
) {
    if (!device || !context) {
        console.error('WebGPU not initialized');
        return;
    }

    // Ensure canvas size matches
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    // Create compute pipeline if needed
    if (!computePipeline) {
        await createComputePipeline();
    }

    // Create or recreate output texture if size changed
    if (!outputTexture || outputTexture.width !== width || outputTexture.height !== height) {
        if (outputTexture) {
            outputTexture.destroy();
        }
        outputTexture = device.createTexture({
            size: { width, height },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        });
    }

    // Split double precision values into high/low parts for better precision
    // This implements Dekker's split for double-double arithmetic
    function splitDouble(value) {
        const hi = Math.fround(value); // Round to f32
        const lo = value - hi;          // Remainder
        return { hi, lo };
    }

    const centerXSplit = splitDouble(centerX);
    const centerYSplit = splitDouble(centerY);

    // Create uniform buffer for parameters (now 40 bytes with double-double coords)
    const uniformData = new ArrayBuffer(48);
    const uniformView = new DataView(uniformData);
    uniformView.setUint32(0, width, true);
    uniformView.setUint32(4, height, true);
    uniformView.setFloat32(8, centerXSplit.hi, true);   // centerX_hi
    uniformView.setFloat32(12, centerXSplit.lo, true);  // centerX_lo
    uniformView.setFloat32(16, centerYSplit.hi, true);  // centerY_hi
    uniformView.setFloat32(20, centerYSplit.lo, true);  // centerY_lo
    uniformView.setFloat32(24, zoom, true);
    uniformView.setUint32(28, maxIterations, true);

    if (uniformBuffer) {
        uniformBuffer.destroy();
    }
    uniformBuffer = device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Create palette buffer
    if (paletteBuffer) {
        paletteBuffer.destroy();
    }
    paletteBuffer = device.createBuffer({
        size: paletteData.length * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    // Convert to Float32Array if it's not already
    const paletteFloat32 = paletteData instanceof Float32Array ? paletteData : new Float32Array(paletteData);
    device.queue.writeBuffer(paletteBuffer, 0, paletteFloat32);

    // Create compute bind group
    computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: outputTexture.createView() },
            { binding: 1, resource: { buffer: uniformBuffer } },
            { binding: 2, resource: { buffer: paletteBuffer } },
        ],
    });

    // Create sampler
    const sampler = device.createSampler({
        magFilter: 'nearest',
        minFilter: 'nearest',
    });

    // Create render bind group
    renderBindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: outputTexture.createView() },
            { binding: 1, resource: sampler },
        ],
    });

    // Encode commands
    const commandEncoder = device.createCommandEncoder();

    // Compute pass
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);

    const workgroupCountX = Math.ceil(width / 8);
    const workgroupCountY = Math.ceil(height / 8);
    computePass.dispatchWorkgroups(workgroupCountX, workgroupCountY);
    computePass.end();

    // Render pass - display the computed texture
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
        }],
    });

    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(3, 1, 0, 0); // Draw fullscreen triangle
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
}

// Resize canvas
export async function resizeCanvas(width, height) {
    if (canvas) {
        canvas.width = width;
        canvas.height = height;
    }
}

// Cleanup
export function cleanup() {
    removeInteraction();

    if (outputTexture) {
        outputTexture.destroy();
        outputTexture = null;
    }
    if (uniformBuffer) {
        uniformBuffer.destroy();
        uniformBuffer = null;
    }
    if (paletteBuffer) {
        paletteBuffer.destroy();
        paletteBuffer = null;
    }
    device = null;
    context = null;
    canvas = null;
}
