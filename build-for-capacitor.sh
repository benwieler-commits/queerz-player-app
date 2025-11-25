#!/bin/bash
# Build script for Capacitor - Linux/Mac

echo "Creating www directory for Capacitor..."

# Remove old www directory if it exists
rm -rf www

# Create www directory
mkdir -p www

# Copy essential files
echo "Copying files..."
cp index.html www/
cp app.js www/
cp styles.css www/
cp manifest.json www/
cp service-worker.js www/
cp firebase-config.js www/
cp firebase-broadcast.js www/
cp blank-character-v2.json www/
cp favicon.ico www/ 2>/dev/null || true

# Copy directories
echo "Copying directories..."
cp -r icons www/
cp -r images www/
cp -r characters www/

echo ""
echo "Build complete! www directory ready for Capacitor."
echo "Run: npx cap sync android"
