namespace PanoramicData.Fractals.Utilities;

/// <summary>
/// Utility for splitting C# doubles into high/low float pairs for GPU double-double emulation
/// </summary>
public static class DoubleDouble
{
	/// <summary>
	/// Splits a double into high and low float components for double-double precision
	/// Uses Dekker's split algorithm
	/// </summary>
	/// <param name="value">The double value to split</param>
	/// <returns>Tuple of (high, low) float components</returns>
	public static (float High, float Low) Split(double value)
	{
		// Convert to float (this is the "high" part)
		var high = (float)value;
		
		// Calculate the "low" part as the difference
		// This captures the precision lost in the float conversion
		var low = (float)(value - high);
		
		return (high, low);
	}

	/// <summary>
	/// Splits a double into high and low components with explicit splitting factor
	/// More accurate version using Dekker's algorithm with a splitting constant
	/// </summary>
	/// <param name="value">The double value to split</param>
	/// <returns>Tuple of (high, low) float components</returns>
	public static (float High, float Low) SplitAccurate(double value)
	{
		// Dekker's split constant for 24-bit mantissa (float)
		// 2^12 + 1 = 4097 (splits mantissa roughly in half)
		const double splitter = 4097.0;
		
		var c = splitter * value;
		var high = (float)(c - (c - value));
		var low = (float)(value - high);
		
		return (high, low);
	}
}
