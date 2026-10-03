# Genera el kit de marca provisional (RF-064, P-13) a partir del logotipo PNG.
# Uso (Windows PowerShell 5.1, sin dependencias): powershell -File tools/generar_kit_marca.ps1
# Cuando exista el logotipo vectorial (SVG) este script deja de ser necesario.

$ErrorActionPreference = 'Stop'
$raiz    = Split-Path -Parent $PSScriptRoot
# Se localiza por patrón: PowerShell 5.1 lee los .ps1 sin BOM como ANSI y rompería la tilde del nombre
$origen  = (Get-ChildItem (Join-Path $raiz 'docs/diseno') -Filter 'Logo Pyme Hub*.png' | Select-Object -First 1).FullName
$destino = Join-Path $raiz 'public/assets/brand'

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class KitMarca
{
    // El PNG puede traer canal alfa: se compone sobre blanco antes de analizarlo.
    static Color Plano(Color c)
    {
        Func<int, int> f = v => 255 - (int)Math.Round((255 - v) * c.A / 255.0);
        return Color.FromArgb(255, f(c.R), f(c.G), f(c.B));
    }

    // Recuadro de los píxeles que no son fondo blanco, opcionalmente limitado a x < maxX.
    public static Rectangle Contenido(Bitmap b, int maxX)
    {
        int x0 = int.MaxValue, y0 = int.MaxValue, x1 = -1, y1 = -1;
        int limite = maxX > 0 ? Math.Min(maxX, b.Width) : b.Width;
        for (int y = 0; y < b.Height; y++)
            for (int x = 0; x < limite; x++)
            {
                Color c = Plano(b.GetPixel(x, y));
                if (Math.Min(c.R, Math.Min(c.G, c.B)) < 235)
                {
                    if (x < x0) x0 = x; if (x > x1) x1 = x;
                    if (y < y0) y0 = y; if (y > y1) y1 = y;
                }
            }
        return Rectangle.FromLTRB(x0, y0, x1 + 1, y1 + 1);
    }

    // Columna vacía más ancha: separa el símbolo del logotipo tipográfico.
    public static int Separacion(Bitmap b, Rectangle r)
    {
        int mejorInicio = -1, mejorAncho = 0, inicio = -1;
        for (int x = r.Left; x < r.Right; x++)
        {
            bool vacia = true;
            for (int y = r.Top; y < r.Bottom && vacia; y++)
            {
                Color c = Plano(b.GetPixel(x, y));
                if (Math.Min(c.R, Math.Min(c.G, c.B)) < 200) vacia = false;
            }
            if (vacia) { if (inicio < 0) inicio = x; }
            else if (inicio >= 0)
            {
                if (x - inicio > mejorAncho) { mejorAncho = x - inicio; mejorInicio = inicio; }
                inicio = -1;
            }
        }
        return mejorInicio + mejorAncho / 2;
    }

    // "Color a alfa" sobre blanco: el fondo se vuelve transparente sin halo.
    public static Bitmap BlancoATransparente(Bitmap src, Rectangle r)
    {
        Bitmap o = new Bitmap(r.Width, r.Height, PixelFormat.Format32bppArgb);
        for (int y = 0; y < r.Height; y++)
            for (int x = 0; x < r.Width; x++)
            {
                Color c = Plano(src.GetPixel(r.X + x, r.Y + y));
                double ar = (255 - c.R) / 255.0, ag = (255 - c.G) / 255.0, ab = (255 - c.B) / 255.0;
                double a = Math.Max(ar, Math.Max(ag, ab));
                if (a < 0.02) { o.SetPixel(x, y, Color.Transparent); continue; }
                Func<int, int> canal = v => (int)Math.Round(Math.Max(0, Math.Min(255, 255 - (255 - v) / a)));
                o.SetPixel(x, y, Color.FromArgb((int)Math.Round(a * 255), canal(c.R), canal(c.G), canal(c.B)));
            }
        return o;
    }

    // Lienzo cuadrado o del ancho pedido con la imagen centrada; fondo opcional.
    public static void Guardar(Bitmap img, int ancho, int alto, double ocupacion, Color fondo, string ruta)
    {
        using (Bitmap lienzo = new Bitmap(ancho, alto, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(lienzo))
        {
            g.Clear(fondo);
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;
            double escala = Math.Min(ancho * ocupacion / img.Width, alto * ocupacion / img.Height);
            int w = (int)Math.Round(img.Width * escala), h = (int)Math.Round(img.Height * escala);
            using (ImageAttributes atr = new ImageAttributes())
            {
                atr.SetWrapMode(WrapMode.TileFlipXY);
                g.DrawImage(img, new Rectangle((ancho - w) / 2, (alto - h) / 2, w, h), 0, 0, img.Width, img.Height, GraphicsUnit.Pixel, atr);
            }
            lienzo.Save(ruta, ImageFormat.Png);
        }
    }
}
'@

$png    = [System.Drawing.Bitmap]::FromFile($origen)
$todo   = [KitMarca]::Contenido($png, 0)
$corte  = [KitMarca]::Separacion($png, $todo)
$simbR  = [KitMarca]::Contenido($png, $corte)

$logo    = [KitMarca]::BlancoATransparente($png, $todo)
$simbolo = [KitMarca]::BlancoATransparente($png, $simbR)
$t = [System.Drawing.Color]::Transparent
$b = [System.Drawing.Color]::White

# Logotipo completo a 2x para 200 px de ancho visible (mínimo digital: 140 px, RNF-049)
$altoLogo = [int][Math]::Round(400 * $logo.Height / $logo.Width)
[KitMarca]::Guardar($logo, 400, $altoLogo, 1.0, $t, (Join-Path $destino 'logo.png'))
# Símbolo transparente para el sidebar y la navegación (hasta 48 px a 2x)
[KitMarca]::Guardar($simbolo, 96, 96, 1.0, $t, (Join-Path $destino 'simbolo.png'))
# Favicons
foreach ($n in 16, 32, 48) { [KitMarca]::Guardar($simbolo, $n, $n, 1.0, $t, (Join-Path $destino "favicon-$n.png")) }
# Iconos de la PWA y de iOS (fondo blanco; la versión maskable deja la zona segura del 80 %)
foreach ($n in 192, 512) {
    [KitMarca]::Guardar($simbolo, $n, $n, 0.84, $b, (Join-Path $destino "icon-$n.png"))
    [KitMarca]::Guardar($simbolo, $n, $n, 0.62, $b, (Join-Path $destino "icon-maskable-$n.png"))
}
[KitMarca]::Guardar($simbolo, 180, 180, 0.80, $b, (Join-Path $destino 'apple-touch-icon.png'))

$png.Dispose(); $logo.Dispose(); $simbolo.Dispose()
Write-Output "Logotipo $todo · corte en x=$corte · símbolo $simbR"
Get-ChildItem $destino | Select-Object Name, Length | Format-Table -AutoSize | Out-String | Write-Output
