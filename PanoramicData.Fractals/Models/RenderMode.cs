namespace PanoramicData.Fractals.Models;

/// <summary>
/// Rendering modes for 3D fractals
/// </summary>
public enum RenderMode
{
	/// <summary>
	/// Distance estimation coloring (current)
	/// </summary>
	DistanceEstimation,

	/// <summary>
	/// Simple diffuse shading with basic lighting
	/// </summary>
	SimpleShading,

	/// <summary>
	/// Ray traced with ambient occlusion and soft shadows
	/// </summary>
	RayTraced
}
