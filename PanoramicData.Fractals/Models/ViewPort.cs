namespace PanoramicData.Fractals.Models;

/// <summary>
/// Represents the viewport state for fractal rendering
/// </summary>
public class ViewPort
{
	/// <summary>
	/// Center X coordinate in the complex plane
	/// </summary>
	public double CenterX { get; set; }

	/// <summary>
	/// Center Y coordinate in the complex plane
	/// </summary>
	public double CenterY { get; set; }

	/// <summary>
	/// Zoom level (1.0 = default view, higher = zoomed in)
	/// </summary>
	public double Zoom { get; set; } = 1.0;

	/// <summary>
	/// Canvas width in pixels
	/// </summary>
	public int Width { get; set; }

	/// <summary>
	/// Canvas height in pixels
	/// </summary>
	public int Height { get; set; }

	/// <summary>
	/// Creates a default viewport for Mandelbrot set
	/// </summary>
	public static ViewPort Default => new()
	{
		CenterX = -0.5,
		CenterY = 0.0,
		Zoom = 1.0,
		Width = 1920,
		Height = 1080
	};
}
