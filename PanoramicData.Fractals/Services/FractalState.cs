using PanoramicData.Fractals.Models;

namespace PanoramicData.Fractals.Services;

/// <summary>
/// Manages the current state of the fractal viewer
/// </summary>
public class FractalState
{
	public FractalType CurrentFractal { get; set; } = FractalType.Mandelbrot;
	public ColorPalette CurrentPalette { get; set; } = ColorPalette.Classic;
	public ViewPort ViewPort { get; set; } = ViewPort.Default;
	public Camera3D Camera3D { get; set; } = Camera3D.Default;  // For Mandelbulb
	public int MaxIterations { get; set; } = 256;
	public bool IsRendering { get; set; }

	public event Action? OnStateChanged;

	/// <summary>
	/// Returns true if the current fractal is 3D (Mandelbulb)
	/// </summary>
	public bool Is3D => CurrentFractal == FractalType.Mandelbulb;

	public void SetFractalType(FractalType type)
	{
		if (CurrentFractal != type)
		{
			CurrentFractal = type;
			NotifyStateChanged();
		}
	}

	public void SetColorPalette(ColorPalette palette)
	{
		if (CurrentPalette != palette)
		{
			CurrentPalette = palette;
			NotifyStateChanged();
		}
	}

	public void UpdateViewPort(ViewPort viewport)
	{
		ViewPort = viewport;
		NotifyStateChanged();
	}

	public void UpdateCamera3D(Camera3D camera)
	{
		Camera3D = camera;
		NotifyStateChanged();
	}

	public void UpdateIterations(int iterations)
	{
		if (MaxIterations != iterations)
		{
			MaxIterations = Math.Clamp(iterations, 64, 2048);
			NotifyStateChanged();
		}
	}

	public void NotifyStateChanged() => OnStateChanged?.Invoke();
}
