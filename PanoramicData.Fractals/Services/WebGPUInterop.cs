using Microsoft.JSInterop;
using PanoramicData.Fractals.Models;
using PanoramicData.Fractals.Utilities;

namespace PanoramicData.Fractals.Services;

/// <summary>
/// JavaScript interop for WebGPU operations
/// </summary>
public class WebGPUInterop(IJSRuntime jsRuntime) : IAsyncDisposable
{
	private IJSObjectReference? _module;
	private bool _initialized;

	private async Task EnsureModuleLoadedAsync()
	{
		if (_module == null)
		{
			try
			{
				_module = await jsRuntime.InvokeAsync<IJSObjectReference>(
					"import", "./js/webgpu-interop.js");
			}
			catch (Exception ex)
			{
				Console.WriteLine($"Failed to load WebGPU module: {ex.Message}");
			}
		}
	}

	public async Task<bool> InitializeAsync(string canvasId)
	{
		try
		{
			await EnsureModuleLoadedAsync();

			if (_module == null)
			{
				return false;
			}

			_initialized = await _module.InvokeAsync<bool>("initialize", canvasId);
			return _initialized;
		}
		catch (Exception ex)
		{
			Console.WriteLine($"WebGPU initialization failed: {ex.Message}");
			return false;
		}
	}

	public async Task<bool> IsWebGPUSupportedAsync()
	{
		try
		{
			await EnsureModuleLoadedAsync();

			return _module != null && await _module.InvokeAsync<bool>("isWebGPUSupported");
		}
		catch
		{
			return false;
		}
	}

	public async Task<(int Width, int Height)> GetCanvasSizeAsync()
	{
		try
		{
			await EnsureModuleLoadedAsync();

			if (_module == null)
			{
				return (800, 800); // Default square size
			}

			var size = await _module.InvokeAsync<CanvasSize>("getCanvasSize");
			return (size.Width, size.Height);
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Failed to get canvas size: {ex.Message}");
			return (800, 800); // Default square size
		}
	}

	public async Task SetupInteractionAsync<T>(DotNetObjectReference<T> dotNetHelper) where T : class
	{
		try
		{
			await EnsureModuleLoadedAsync();

			if (_module == null || !_initialized)
			{
				return;
			}

			await _module.InvokeVoidAsync("setupInteraction", dotNetHelper);
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Failed to setup interaction: {ex.Message}");
		}
	}

	public async Task RenderFractalAsync(
		FractalType fractalType,
		ViewPort viewport,
		Camera3D camera3D,
		bool is3D,
		int maxIterations,
		float[] paletteData,
		Models.RenderMode renderMode = Models.RenderMode.DistanceEstimation)
	{
		if (_module == null || !_initialized)
		{
			return;
		}

		// Split doubles into high/low components for double-double precision
		float centerX, centerXLo, centerY, centerYLo, zoom, param7;

		if (is3D)
		{
			// For 3D: camera position (X, Y, Z), orientation (Yaw, Pitch), and FOV
			var (posXHi, posXLo) = DoubleDouble.Split(camera3D.PositionX);
			var (posYHi, posYLo) = DoubleDouble.Split(camera3D.PositionY);
			var (posZHi, posZLo) = DoubleDouble.Split(camera3D.PositionZ);
			var (yawHi, yawLo) = DoubleDouble.Split(camera3D.Yaw);
			var (pitchHi, pitchLo) = DoubleDouble.Split(camera3D.Pitch);
			
			centerX = posXHi;      // Camera X position (high)
			centerXLo = posZHi;    // Camera Z position (high) - reusing centerXLo for Z
			centerY = posYHi;      // Camera Y position (high)
			centerYLo = yawHi;     // Yaw (high)
			zoom = pitchHi;        // Pitch (high)
			param7 = (float)camera3D.FieldOfView; // FOV (single precision is fine for FOV)
			
			// Note: We're only passing the high components for 3D camera
			// as the precision requirements are lower for camera movement
			// (you won't zoom in billions of times in 3D space)
		}
		else
		{
			// For 2D: viewport center and zoom with full double-double precision
			var (centerXHi, centerXLoVal) = DoubleDouble.Split(viewport.CenterX);
			var (centerYHi, centerYLoVal) = DoubleDouble.Split(viewport.CenterY);
			var (zoomHi, zoomLo) = DoubleDouble.Split(viewport.Zoom);
			
			centerX = centerXHi;
			centerXLo = centerXLoVal;
			centerY = centerYHi;
			centerYLo = centerYLoVal;
			zoom = zoomHi;
			param7 = maxIterations; // For 2D, param7 is maxIterations (not used in shader, but passed for consistency)
		}

		var fractalName = fractalType.ToString().ToLowerInvariant();
		if (is3D && renderMode != Models.RenderMode.DistanceEstimation)
		{
			fractalName += $"_{renderMode.ToString().ToLowerInvariant()}";
		}

		await _module.InvokeVoidAsync("renderFractal",
			fractalName,
			centerX,
			centerY,
			centerXLo,
			centerYLo,
			zoom,
			viewport.Width,
			viewport.Height,
			maxIterations,
			param7,
			paletteData);
	}

	public async Task ResizeCanvasAsync(int width, int height)
	{
		if (_module == null || !_initialized)
		{
			return;
		}

		await _module.InvokeVoidAsync("resizeCanvas", width, height);
	}

	/// <summary>
	/// Capture the current canvas and download as PNG
	/// </summary>
	public async Task CaptureScreenshotAsync(string filename)
	{
		if (_module == null || !_initialized)
		{
			return;
		}

		try
		{
			await _module.InvokeVoidAsync("captureScreenshot", filename);
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Failed to capture screenshot: {ex.Message}");
		}
	}

	public async ValueTask DisposeAsync()
	{
		if (_module != null)
		{
			try
			{
				await _module.InvokeVoidAsync("cleanup");
				await _module.DisposeAsync();
			}
			catch
			{
				// Ignore disposal errors
			}
		}

		GC.SuppressFinalize(this);
	}
	
	private sealed class CanvasSize
	{
		public int Width { get; set; }
		public int Height { get; set; }
	}
}
