using Microsoft.JSInterop;
using PanoramicData.Fractals.Models;

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

		// For 3D Mandelbulb: pass camera position, orientation, and FOV
		// For 2D fractals: use ViewPort
		var centerX = is3D ? camera3D.PositionX : viewport.CenterX;
		var centerY = is3D ? camera3D.PositionY : viewport.CenterY;
		var centerXLo = is3D ? camera3D.PositionZ : 0.0;  // Z position for 3D
		var centerYLo = is3D ? camera3D.Yaw : 0.0;  // Yaw for 3D
		// For 3D: we need to pass BOTH pitch and FOV, so we use zoom for pitch and param7 for FOV
		var zoom = is3D ? camera3D.Pitch : viewport.Zoom;  // Pitch for 3D, zoom for 2D
		var param7 = is3D ? camera3D.FieldOfView : maxIterations;  // FOV for 3D, maxIterations for 2D

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
			param7,  // Pass FOV as extra parameter
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
