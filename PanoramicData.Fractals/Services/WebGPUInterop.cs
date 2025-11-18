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
		int maxIterations,
		float[] paletteData)
	{
		if (_module == null || !_initialized)
		{
			return;
		}

		await _module.InvokeVoidAsync("renderFractal",
			fractalType.ToString().ToLowerInvariant(),
			viewport.CenterX,
			viewport.CenterY,
			viewport.Zoom,
			viewport.Width,
			viewport.Height,
			maxIterations,
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
	private class CanvasSize
	{
		public int Width { get; set; }
		public int Height { get; set; }
	}
}
