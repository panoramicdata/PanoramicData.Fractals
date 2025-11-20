// Re-export shaderCommon from the dedicated module
export { shaderCommon } from './shader-common.js';

// Fractal shader loader - loads WGSL files at runtime
// Shaders are now stored as .wgsl files for proper linting and syntax highlighting

/**
 * Load a WGSL shader file
 * @param {string} shaderName - Name of the shader (e.g., 'mandelbrot', 'phoenix')
 * @returns {Promise<string>} The shader code
 */
async function loadShader(shaderName) {
	const response = await fetch(`./shaders/${shaderName}.wgsl`);
	if (!response.ok) {
		throw new Error(`Failed to load shader ${shaderName}: ${response.statusText}`);
	}
	return await response.text();
}

/**
 * Load common shader code
 * @returns {Promise<string>} The common shader code
 */
let commonShaderCache = null;
async function loadCommonShader() {
	if (commonShaderCache) {
		return commonShaderCache;
	}

	const response = await fetch('./shaders/common.wgsl');
	if (!response.ok) {
		throw new Error(`Failed to load common shader: ${response.statusText}`);
	}

	commonShaderCache = await response.text();
	return commonShaderCache;
}

/**
 * Load a shader with common code prepended (for most fractals)
 * @param {string} shaderName - Name of the shader
 * @returns {Promise<string>} The combined shader code
 */
async function loadCombinedShader(shaderName) {
	const [common, shader] = await Promise.all([
		loadCommonShader(),
		loadShader(shaderName)
	]);

	return common + '\n\n' + shader;
}

/**
 * Load a standalone shader (for landscape, mandelbulb variants)
 * @param {string} shaderName - Name of the shader
 * @returns {Promise<string>} The shader code
 */
async function loadStandaloneShader(shaderName) {
	return await loadShader(shaderName);
}

// Shaders that don't use common.wgsl
const STANDALONE_SHADERS = new Set([
	'landscape',
	'mandelbulb',
	'mandelbulb-simpleshading',
	'mandelbulb-raytraced'
]);

/**
 * Get shader code for a specific fractal
 * @param {string} fractalName - Name of the fractal (e.g., 'mandelbrot', 'landscape')
 * @returns {Promise<string>} The complete shader code
 */
export async function getShaderCode(fractalName) {
	const shaderName = fractalName.toLowerCase();

	if (STANDALONE_SHADERS.has(shaderName)) {
		return await loadStandaloneShader(shaderName);
	} else {
		return await loadCombinedShader(shaderName);
	}
}

// Pre-load common shader on module load for better performance
loadCommonShader().catch(err => console.warn('Failed to pre-load common shader:', err));
