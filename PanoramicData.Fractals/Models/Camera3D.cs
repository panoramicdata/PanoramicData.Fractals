namespace PanoramicData.Fractals.Models;

/// <summary>
/// Represents a 3D camera with position and orientation (FPS-style)
/// </summary>
public class Camera3D
{
	/// <summary>
	/// Camera position in world space - X coordinate
	/// </summary>
	public double PositionX { get; set; } = 0.0;

	/// <summary>
	/// Camera position in world space - Y coordinate
	/// </summary>
	public double PositionY { get; set; } = 1.0;

	/// <summary>
	/// Camera position in world space - Z coordinate
	/// </summary>
	public double PositionZ { get; set; } = 3.0;

	/// <summary>
	/// Yaw - rotation around world Y axis (left/right look) in radians
	/// </summary>
	public double Yaw { get; set; } = 0.0;

	/// <summary>
	/// Pitch - rotation around camera's local X axis (up/down look) in radians
	/// </summary>
	public double Pitch { get; set; } = 0.3;

	/// <summary>
	/// Field of view in radians (for zoom effect)
	/// </summary>
	public double FieldOfView { get; set; } = 1.0;

	/// <summary>
	/// Mandelbulb power parameter (typically 8)
	/// </summary>
	public double Power { get; set; } = 8.0;

	/// <summary>
	/// Creates a default camera for Mandelbulb viewing
	/// </summary>
	public static Camera3D Default => new()
	{
		PositionX = 0.0,
		PositionY = 1.0,
		PositionZ = 3.0,
		Yaw = 0.0,
		Pitch = 0.3,  // Slight downward angle
		FieldOfView = 1.0,
		Power = 8.0
	};
}
