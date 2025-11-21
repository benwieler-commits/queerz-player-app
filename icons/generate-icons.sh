#!/bin/bash

# Icon Generation Script for QUEERZ! Player App
# This script generates app icons in various sizes

# Colors from the app theme
BG_COLOR="#4A7C7E"
TEXT_COLOR="#FFFFFF"

# Array of required icon sizes
SIZES=(72 96 128 144 152 192 384 512)

echo "Generating QUEERZ! Player App icons..."

for size in "${SIZES[@]}"; do
    echo "Creating ${size}x${size} icon..."

    # Generate SVG with rainbow emoji and text
    convert -size ${size}x${size} \
        xc:"${BG_COLOR}" \
        -gravity center \
        -pointsize $((size / 3)) \
        -fill "${TEXT_COLOR}" \
        -annotate +0+0 "🌈" \
        "icon-${size}x${size}.png"

    echo "✓ Created icon-${size}x${size}.png"
done

echo ""
echo "All icons generated successfully!"
echo "Icons are located in the current directory."
