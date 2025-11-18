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
	public int MaxIterations { get; set; } = 256;
	public bool IsRendering { get; set; }

	public event Action? OnStateChanged;

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

	public void UpdateIterations(int iterations)
	{
		if (MaxIterations != iterations)
		{
			MaxIterations = Math.Clamp(iterations, 64, 2048);
			NotifyStateChanged();
		}
	}

	private void NotifyStateChanged() => OnStateChanged?.Invoke();
}
