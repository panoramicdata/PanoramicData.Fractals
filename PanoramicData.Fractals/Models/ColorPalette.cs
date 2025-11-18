namespace PanoramicData.Fractals.Models;

/// <summary>
/// Represents a color palette for fractal rendering
/// </summary>
public class ColorPalette
{
	public string Name { get; set; } = string.Empty;
	public List<ColorStop> Colors { get; set; } = new();

	public static ColorPalette Classic => new()
	{
		Name = "Classic",
		Colors = new()
		{
			new ColorStop(0.0f, 0, 7, 100),
			new ColorStop(0.16f, 32, 107, 203),
			new ColorStop(0.42f, 237, 255, 255),
			new ColorStop(0.6425f, 255, 170, 0),
			new ColorStop(0.8575f, 0, 2, 0),
			new ColorStop(1.0f, 0, 7, 100)
		}
	};

	public static ColorPalette Fire => new()
	{
		Name = "Fire",
		Colors = new()
		{
			new ColorStop(0.0f, 0, 0, 0),
			new ColorStop(0.25f, 128, 0, 0),
			new ColorStop(0.5f, 255, 0, 0),
			new ColorStop(0.75f, 255, 128, 0),
			new ColorStop(1.0f, 255, 255, 0)
		}
	};

	public static ColorPalette Ocean => new()
	{
		Name = "Ocean",
		Colors = new()
		{
			new ColorStop(0.0f, 0, 0, 64),
			new ColorStop(0.33f, 0, 64, 128),
			new ColorStop(0.66f, 0, 128, 192),
			new ColorStop(1.0f, 64, 192, 255)
		}
	};

	public static ColorPalette Grayscale => new()
	{
		Name = "Grayscale",
		Colors = new()
		{
			new ColorStop(0.0f, 0, 0, 0),
			new ColorStop(1.0f, 255, 255, 255)
		}
	};

	public static ColorPalette Rainbow => new()
	{
		Name = "Rainbow",
		Colors = new()
		{
			new ColorStop(0.0f, 255, 0, 0),
			new ColorStop(0.17f, 255, 165, 0),
			new ColorStop(0.33f, 255, 255, 0),
			new ColorStop(0.5f, 0, 255, 0),
			new ColorStop(0.67f, 0, 0, 255),
			new ColorStop(0.83f, 139, 0, 255),
			new ColorStop(1.0f, 255, 0, 0)
		}
	};

	public static ColorPalette Psychedelic => new()
	{
		Name = "Psychedelic",
		Colors = new()
		{
			new ColorStop(0.0f, 255, 0, 255),
			new ColorStop(0.2f, 0, 255, 255),
			new ColorStop(0.4f, 255, 255, 0),
			new ColorStop(0.6f, 255, 0, 0),
			new ColorStop(0.8f, 0, 255, 0),
			new ColorStop(1.0f, 255, 0, 255)
		}
	};

	public static ColorPalette UltraFractal => new()
	{
		Name = "Ultra Fractal",
		Colors = new()
		{
			new ColorStop(0.0f, 66, 30, 15),
			new ColorStop(0.25f, 25, 7, 26),
			new ColorStop(0.5f, 9, 1, 47),
			new ColorStop(0.75f, 4, 4, 73),
			new ColorStop(1.0f, 0, 7, 100)
		}
	};

	public static List<ColorPalette> AllPalettes => new()
	{
		Classic,
		Fire,
		Ocean,
		Grayscale,
		Rainbow,
		Psychedelic,
		UltraFractal
	};
}

public record ColorStop(float Position, byte R, byte G, byte B);
