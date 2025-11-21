# QUEERZ! Player App - Progressive Web App (PWA)

## 🎉 Mobile App Features

This app is now a **Progressive Web App (PWA)**, which means you can install it on your mobile device and use it like a native app!

### What's New?

✅ **Install to Home Screen** - Add the app to your phone's home screen
✅ **Offline Support** - Use the app even without internet (except Firebase sync)
✅ **Fast Loading** - Cached resources for instant startup
✅ **Mobile Optimized** - Responsive design for phones and tablets
✅ **App-Like Experience** - Full-screen mode, no browser UI
✅ **Background Sync** - Your changes sync when you're back online

---

## 📱 How to Install on Mobile

### iOS (iPhone/iPad)

1. Open Safari and navigate to your app URL
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right corner
5. The app icon will appear on your home screen!

### Android (Chrome)

1. Open Chrome and navigate to your app URL
2. Tap the **Menu** (three dots) in the top right
3. Select **"Add to Home Screen"** or **"Install App"**
4. Tap **"Add"** or **"Install"**
5. The app icon will appear on your home screen!

---

## 🔧 Technical Details

### PWA Components

- **`manifest.json`** - App metadata, icons, and configuration
- **`service-worker.js`** - Handles caching and offline functionality
- **`icons/`** - App icons in multiple sizes (72x72 to 512x512)

### Caching Strategy

The app uses a **Cache-First** strategy:
- Core app files are cached on first visit
- Updates check network first, fall back to cache
- Firebase connections always use network
- Music/media files are not cached (too large)

### Offline Capabilities

**Works Offline:**
- View and edit character sheets
- Use dice roller
- Access all game mechanics
- View cached character data

**Requires Online:**
- Firebase sync with MC
- Broadcasting to/from MC
- Cloud save/load
- Downloading character portraits

---

## 🎨 Customizing Icons

The app comes with placeholder icons. To create custom icons:

### Option 1: Use the SVG Template
1. Open `icons/icon-template.svg` in a vector editor (Illustrator, Figma, Inkscape)
2. Customize the design
3. Export as PNG in sizes: 72, 96, 128, 144, 152, 192, 384, 512 pixels
4. Replace the generated icons

### Option 2: Run the Icon Generator (with Pillow)
```bash
cd icons
pip install Pillow
python3 generate_icons.py
```

### Option 3: Use Online Tools
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [Favicon.io](https://favicon.io/)
- Upload your custom icon and download all sizes

---

## 🧪 Testing PWA Features

### Test Installation
1. Deploy the app to a web server (HTTPS required!)
2. Open Chrome DevTools → Application → Manifest
3. Check for errors
4. Use "Add to Home Screen" to test installation

### Test Service Worker
1. Open Chrome DevTools → Application → Service Workers
2. Check that the worker is registered and running
3. Enable "Offline" mode to test offline functionality

### Test Caching
1. Load the app once
2. Disconnect from internet
3. Reload the page - it should still work!
4. Character data should be accessible

### Lighthouse Audit
1. Open Chrome DevTools → Lighthouse
2. Run a PWA audit
3. Aim for 100% PWA score!

---

## 🚀 Deployment Tips

### Requirements for PWA
- ✅ **HTTPS** - PWAs require secure connections (except localhost)
- ✅ **Valid manifest.json** - Must be linked in HTML
- ✅ **Service worker** - Must be registered
- ✅ **Icons** - At least 192x192 and 512x512 sizes

### Recommended Hosting
- **GitHub Pages** - Free HTTPS hosting
- **Netlify** - Auto-deploy from Git
- **Vercel** - Fast edge network
- **Firebase Hosting** - Integrated with Firebase services

### Deployment Checklist
- [ ] Update `start_url` in manifest.json if needed
- [ ] Ensure all icon paths are correct
- [ ] Test on real mobile devices
- [ ] Verify HTTPS is working
- [ ] Check service worker registration

---

## 📊 Browser Support

| Browser | Installation | Offline | Push Notifications |
|---------|-------------|---------|-------------------|
| Chrome (Android) | ✅ | ✅ | ✅ |
| Safari (iOS 16.4+) | ✅ | ✅ | ⚠️ Limited |
| Samsung Internet | ✅ | ✅ | ✅ |
| Firefox (Android) | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |

---

## 🐛 Troubleshooting

### "Add to Home Screen" not appearing?
- Ensure you're using HTTPS (or localhost)
- Check manifest.json is valid
- Verify service worker is registered
- Try on a different browser

### App not working offline?
- Check service worker in DevTools
- Clear cache and reload
- Verify caching strategy in service-worker.js

### Icons not showing?
- Run the icon generation script
- Check file paths in manifest.json
- Clear browser cache

### Firebase not syncing?
- Firebase requires internet connection
- Check Firebase configuration
- Service worker doesn't cache Firebase requests

---

## 🔄 Future Enhancements

Potential PWA features to add:
- [ ] Push notifications for MC broadcasts
- [ ] Background sync for offline changes
- [ ] Web Share API for sharing characters
- [ ] File System API for local saves
- [ ] Bluetooth API for dice rollers

---

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox (Service Worker Library)](https://developers.google.com/web/tools/workbox)

---

**Enjoy your QUEERZ! Player Companion as a mobile app! 🌈**
