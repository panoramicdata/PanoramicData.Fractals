import { fractalShaders } from './fractal-shaders.js';

// WebGPU state
let device = null;
let context = null;
let canvas = null;
let renderPipeline = null;
let computePipelines = {}; // Store multiple pipelines for different fractals
let currentFractalType = 'mandelbrot';
let outputTexture = null;
let uniformBuffer = null;
let paletteBuffer = null;
let computeBindGroup = null;
let renderBindGroup = null;
let presentationFormat = null;

// Interaction state
let isPanning = false;
let isShiftPressed = false;  // Track shift key for 3D camera panning
let lastMouseX = 0;
let lastMouseY = 0;
let interactionCallback = null;

// Check if WebGPU is supported
export function isWebGPUSupported() {
    const supported = navigator.gpu !== undefined;
    console.log('WebGPU support check:', supported);
    return supported;
}

// Get fullscreen window dimensions
export function getCanvasSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
        width: width,
        height: height
    };
}

// Setup mouse/touch interaction handlers
export function setupInteraction(dotNetHelper) {
    if (!canvas) {
        console.error('Canvas not initialized');
        return;
    }

    interactionCallback = dotNetHelper;

    // Track Shift key state
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            isShiftPressed = true;
        }
        
        // WASD+QZ+EC keyboard movement for 3D camera
        const validKeys = ['w', 'a', 's', 'd', 'q', 'z', 'e', 'c', 'W', 'A', 'S', 'D', 'Q', 'Z', 'E', 'C'];
        if (validKeys.includes(e.key)) {
            e.preventDefault();
            interactionCallback.invokeMethodAsync('OnKeyboardMove', e.key.toLowerCase());
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            isShiftPressed = false;
        }
    });

    // Mouse down - start panning
    canvas.addEventListener('mousedown', (e) => {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.preventDefault();
    });

    // Mouse move - pan OR rotate (depending on Shift key)
    canvas.addEventListener('mousemove', async (e) => {
        if (!isPanning) return;

        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // Shift+drag for 3D camera panning, regular drag for rotation/2D pan
        if (isShiftPressed) {
            await interactionCallback.invokeMethodAsync('OnCameraPan', deltaX, deltaY);
        } else {
            await interactionCallback.invokeMethodAsync('OnPan', deltaX, deltaY);
        }
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

        // FIXED: Inverted zoom direction - scroll down now zooms IN (feels more natural for 3D)
        const zoomDelta = e.deltaY < 0 ? 0.9 : 1.1; // deltaY < 0 (scroll up) = zoom out

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
            // Single touch - pan/rotate
            isPanning = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Two touches - zoom OR pan (depending on gesture)
            isPanning = false;
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            touchStartDist = Math.sqrt(dx * dx + dy * dy);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', async (e) => {
        e.preventDefault();

        if (e.touches.length === 1 && isPanning) {
            // Single touch pan/rotate
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;

            await interactionCallback.invokeMethodAsync('OnPan', deltaX, deltaY);
        } else if (e.touches.length === 2) {
            // Two-finger: check if pinch (zoom) or drag (pan)
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            const currentDist = Math.sqrt(dx * dx + dy * dy);

            if (touchStartDist > 0) {
                const distChange = Math.abs(currentDist - touchStartDist);
                
                // If fingers are moving apart/together significantly = pinch zoom
                if (distChange > 5) {
                    const zoomDelta = currentDist / touchStartDist;

                    // Get center point between touches
                    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                    const rect = canvas.getBoundingClientRect();
                    const normalizedX = (centerX - rect.left) / canvas.width;
                    const normalizedY = (centerY - rect.top) / canvas.height;

                    await interactionCallback.invokeMethodAsync('OnZoom', zoomDelta, normalizedX, normalizedY);
                }
                // Otherwise, two-finger drag = 3D camera pan
                else {
                    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    
                    // Calculate movement of center point
                    const prevCenterX = (touchStartX + e.touches[1].clientX - (e.touches[0].clientX - touchStartX)) / 2;
                    const prevCenterY = (touchStartY + e.touches[1].clientY - (e.touches[0].clientY - touchStartY)) / 2;
                    
                    const panDeltaX = centerX - prevCenterX;
                    const panDeltaY = centerY - prevCenterY;
                    
                    await interactionCallback.invokeMethodAsync('OnCameraPan', panDeltaX, panDeltaY);
                }
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

// Create compute pipeline for a specific fractal type
async function createComputePipeline(fractalType) {
    const shaderCode = fractalShaders[fractalType];
    if (!shaderCode) {
        console.error(`Unknown fractal type: ${fractalType}`);
        return null;
    }

    console.log(`Creating compute pipeline for ${fractalType}...`);
    console.log(`Shader code length: ${shaderCode.length} characters`);

    try {
        const shaderModule = device.createShaderModule({
            code: shaderCode,
        });

        // Check for shader compilation errors
        const compilationInfo = await shaderModule.getCompilationInfo();
        if (compilationInfo.messages.length > 0) {
            console.warn(`Shader compilation messages for ${fractalType}:`);
            for (const message of compilationInfo.messages) {
                console.log(`  [${message.type}] Line ${message.lineNum}: ${message.message}`);
            }
        }

        const pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main',
            },
        });

        console.log(`Pipeline created successfully for ${fractalType}`);
        return pipeline;
    } catch (error) {
        console.error(`Failed to create pipeline for ${fractalType}:`, error);
        console.error('Error details:', error.message);
        console.error('Shader code (first 500 chars):', shaderCode.substring(0, 500));
        return null;
    }
}

// Render fractal
export async function renderFractal(
    fractalType,
    centerX,
    centerY,
    centerXLo,
    centerYLo,
    zoom,
    width,
    height,
    maxIterations,
    fieldOfView,  // NEW: Field of View for 3D camera
    paletteData
) {
    if (!device || !context) {
        console.error('WebGPU not initialized');
        return;
    }

    // DEBUG LOGGING for Mandelbulb
    if (fractalType === 'mandelbulb') {
        console.log('=== WEBGPU RENDER DEBUG ===');
        console.log('fractalType:', fractalType);
        console.log('Camera Position:', centerX, centerY, centerXLo);
        console.log('Yaw:', centerYLo);
        console.log('Pitch:', zoom);
        console.log('FOV:', fieldOfView);
        console.log('width x height:', width, 'x', height);
    }

    // Ensure canvas size matches
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    // Create or get compute pipeline for this fractal type
    if (!computePipelines[fractalType]) {
        console.log(`Creating pipeline for ${fractalType}...`);
        computePipelines[fractalType] = await createComputePipeline(fractalType);
    }

    const computePipeline = computePipelines[fractalType];
    if (!computePipeline) {
        console.error(`Failed to create pipeline for ${fractalType}`);
        return;
    }

    currentFractalType = fractalType;

    // Create or recreate output texture if size changed
    if (!outputTexture || outputTexture.width !== width || outputTexture.height !== height) {
        if (outputTexture) {
            outputTexture.destroy();
        }
        outputTexture = device.createTexture({
            size: { width, height },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
        });
    }

    // Create uniform buffer for parameters - EXPANDED to include FOV
    const uniformData = new ArrayBuffer(64);  // Increased from 48 to 64 bytes
    const uniformView = new DataView(uniformData);
    uniformView.setUint32(0, width, true);
    uniformView.setUint32(4, height, true);
    uniformView.setFloat32(8, centerX, true);        // For 3D: posX, For 2D: centerX_hi
    uniformView.setFloat32(12, centerXLo, true);     // For 3D: posZ, For 2D: centerX_lo
    uniformView.setFloat32(16, centerY, true);       // For 3D: posY, For 2D: centerY_hi
    uniformView.setFloat32(20, centerYLo, true);     // For 3D: yaw, For 2D: centerY_lo
    uniformView.setFloat32(24, zoom, true);          // For 3D: pitch, For 2D: zoom
    uniformView.setUint32(28, maxIterations, true);
    uniformView.setFloat32(32, fieldOfView, true);   // NEW: Field of View

    if (uniformBuffer) {
        uniformBuffer.destroy();
    }
    uniformBuffer = device.createBuffer({
        size: 64,  // Increased from 48
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Create palette buffer (skip for landscape fractal which doesn't use it)
    const usePalette = fractalType !== 'landscape';
    
    if (usePalette) {
        if (paletteBuffer) {
            paletteBuffer.destroy();
        }
        paletteBuffer = device.createBuffer({
            size: paletteData.length * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        const paletteFloat32 = paletteData instanceof Float32Array ? paletteData : new Float32Array(paletteData);
        device.queue.writeBuffer(paletteBuffer, 0, paletteFloat32);
    }

    // Create compute bind group (conditionally include palette)
    const bindGroupEntries = [
        { binding: 0, resource: outputTexture.createView() },
        { binding: 1, resource: { buffer: uniformBuffer } },
    ];
    
    if (usePalette) {
        bindGroupEntries.push({ binding: 2, resource: { buffer: paletteBuffer } });
    }
    
    computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: bindGroupEntries,
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
    
    if (fractalType === 'mandelbulb') {
        await device.queue.onSubmittedWorkDone();
        console.log('GPU work complete');
    }
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
    
    // Clean up all compute pipelines
    computePipelines = {};
    
    device = null;
    context = null;
    canvas = null;
}

// Capture screenshot and download as PNG
export async function captureScreenshot(filename) {
    if (!canvas || !device || !context || !outputTexture) {
        console.error('Required resources not available for screenshot');
        console.log('Available:', { 
            canvas: !!canvas, 
            device: !!device, 
            context: !!context, 
            outputTexture: !!outputTexture 
        });
        return;
    }

    try {
        console.log('Capturing screenshot...');
        console.log('Output texture format:', outputTexture.format);
        console.log('Output texture size:', outputTexture.width, 'x', outputTexture.height);
        
        // Wait for GPU to finish all work
        await device.queue.onSubmittedWorkDone();
        
        console.log('GPU work complete, reading texture data...');
        
        const width = outputTexture.width;
        const height = outputTexture.height;
        
        // Create a buffer to read the texture data
        const bytesPerPixel = 4; // RGBA
        const bytesPerRow = Math.ceil((width * bytesPerPixel) / 256) * 256; // Align to 256 bytes
        const bufferSize = bytesPerRow * height;
        
        console.log('Creating read buffer, size:', bufferSize, 'bytes');
        
        const readBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        
        // Copy the output texture to the buffer
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            { texture: outputTexture },
            { buffer: readBuffer, bytesPerRow: bytesPerRow },
            { width, height }
        );
        device.queue.submit([commandEncoder.finish()]);
        
        // Wait for copy to complete
        await device.queue.onSubmittedWorkDone();
        
        console.log('Texture copied to buffer, reading data...');
        
        // Map the buffer and read the data
        await readBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = readBuffer.getMappedRange();
        const pixelData = new Uint8Array(arrayBuffer);
        
        console.log('Data read, checking for non-black pixels...');
        
        // Check if image has any non-black pixels
        let hasColor = false;
        let sampleCount = 0;
        let nonZeroCount = 0;
        
        // Sample every 100th pixel to check for content
        for (let i = 0; i < pixelData.length; i += 400) {
            sampleCount++;
            if (pixelData[i] > 0 || pixelData[i + 1] > 0 || pixelData[i + 2] > 0) {
                nonZeroCount++;
                hasColor = true;
            }
        }
        
        console.log(`Sampled ${sampleCount} pixels, found ${nonZeroCount} non-black pixels`);
        console.log('First 100 bytes:', Array.from(pixelData.slice(0, 100)));
        
        if (!hasColor) {
            console.error('Image appears to be completely black! This is not a valid screenshot.');
            console.log('Debug info:');
            console.log('- Texture format:', outputTexture.format);
            console.log('- Texture usage:', outputTexture.usage);
            console.log('- Bytes per row:', bytesPerRow);
            console.log('- Buffer size:', bufferSize);
            
            readBuffer.unmap();
            readBuffer.destroy();
            
            alert('Screenshot failed: Image is completely black. This might be a WebGPU texture format issue.');
            return;
        }
        
        console.log('Valid image data found, creating canvas...');
        
        // Create a temporary canvas and copy the pixel data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get 2D context');
            readBuffer.unmap();
            readBuffer.destroy();
            return;
        }
        
        // Create ImageData and copy pixels
        const imageData = ctx.createImageData(width, height);
        
        // Copy data row by row (accounting for padding)
        for (let y = 0; y < height; y++) {
            const srcOffset = y * bytesPerRow;
            const dstOffset = y * width * bytesPerPixel;
            for (let x = 0; x < width; x++) {
                const srcIdx = srcOffset + x * bytesPerPixel;
                const dstIdx = dstOffset + x * bytesPerPixel;
                imageData.data[dstIdx] = pixelData[srcIdx];     // R
                imageData.data[dstIdx + 1] = pixelData[srcIdx + 1]; // G
                imageData.data[dstIdx + 2] = pixelData[srcIdx + 2]; // B
                imageData.data[dstIdx + 3] = 255; // A (force opaque)
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Clean up GPU resources
        readBuffer.unmap();
        readBuffer.destroy();
        
        console.log('Image created, downloading...');
        
        // Convert to blob and download
        tempCanvas.toBlob((blob) => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            console.log('Blob created, size:', blob.size, 'bytes');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename || `fractal-${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('Screenshot downloaded successfully!');
        }, 'image/png', 1.0);
    } catch (error) {
        console.error('Screenshot capture failed:', error);
        console.error('Error stack:', error.stack);
    }
}
