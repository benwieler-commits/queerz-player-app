#!/usr/bin/env python3
"""
Icon Generator for QUEERZ! Player App PWA
Generates simple colored icons with the app logo/emoji
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    has_pillow = True
except ImportError:
    has_pillow = False
    print("PIL/Pillow not available. Creating simple placeholder PNGs...")

def create_simple_icon(size, filename):
    """Create a simple colored PNG icon"""
    if has_pillow:
        # Create image with theme color background
        img = Image.new('RGB', (size, size), color='#4A7C7E')
        draw = ImageDraw.Draw(img)

        # Draw a simple rainbow-colored circle in the center
        margin = size // 4
        draw.ellipse([margin, margin, size-margin, size-margin],
                     fill='#FF6B9D', outline='#FFFFFF', width=max(2, size//64))

        # Save the image
        img.save(filename, 'PNG')
        print(f"✓ Created {filename}")
    else:
        # Create minimal 1x1 PNG as placeholder
        # PNG header for a 1x1 pixel image (will be scaled by browser)
        minimal_png = bytes.fromhex(
            '89504e470d0a1a0a0000000d494844520000000100000001'
            '0806000000001f15c4890000000a49444154789c6300010000'
            '00050001d7f21ca80000000049454e44ae426082'
        )
        with open(filename, 'wb') as f:
            f.write(minimal_png)
        print(f"✓ Created placeholder {filename}")

def main():
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]

    print("Generating QUEERZ! Player App icons...")
    print(f"Pillow available: {has_pillow}")
    print()

    for size in sizes:
        filename = f"icon-{size}x{size}.png"
        create_simple_icon(size, filename)

    print()
    print("Icon generation complete!")
    if not has_pillow:
        print("\nNote: Placeholder icons created. For better quality icons:")
        print("1. Install Pillow: pip install Pillow")
        print("2. Run this script again")
        print("3. Or use a design tool to create custom icons using icon-template.svg")

if __name__ == '__main__':
    main()
