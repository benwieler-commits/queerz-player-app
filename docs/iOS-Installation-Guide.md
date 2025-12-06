# QUEERZ! Player App - iOS Installation Guide

## For iPhone/iPad Users

The QUEERZ! Player Companion works great on iOS as a **Progressive Web App (PWA)**. You don't need to install it through the App Store - you can add it directly to your home screen from Safari!

---

## Installation Steps

### 1. Open Safari Browser
- **IMPORTANT:** You **must** use Safari on iOS. Chrome/Firefox won't work for PWA installation.
- Open Safari and navigate to the app URL (ask your game master for the link)

### 2. Add to Home Screen
1. Tap the **Share button** (the square with an arrow pointing up) at the bottom of Safari
2. Scroll down and tap **"Add to Home Screen"**
3. You'll see the app icon and name "QUEERZ Player"
4. Tap **"Add"** in the top right

### 3. Launch the App
- Find the **QUEERZ! Player** icon on your home screen
- Tap it to launch - it opens in full-screen mode, just like a native app!
- No Safari toolbar, no browser UI - feels just like an app

---

## Features That Work on iOS

✅ **Full-screen app experience** - Looks and feels like a native app
✅ **Offline support** - Works without internet after first load
✅ **Character management** - Create, edit, save characters
✅ **Dice rolling** - Full 2d6 + power mechanics
✅ **Cloud sync** - Save characters to cloud (requires internet)
✅ **Real-time MC sync** - Broadcast to MC in real-time
✅ **Portrait uploads** - Upload character portraits from Photos
✅ **Push to home screen** - App icon on your home screen

---

## Important Notes for iOS Users

### Portrait/Landscape
- The app works best in **portrait mode**
- You can use landscape if needed, but portrait is recommended

### Notch/Safe Area Support
- The app automatically handles iPhone notch and safe areas
- No content will be hidden behind the notch

### Permissions
- **Camera/Photos:** If you want to upload character portraits, allow photo access when prompted
- **Notifications:** Not currently used, but may be added in future

### Updating the App
When the app is updated:
1. Close the PWA completely (swipe up from home, swipe away)
2. Re-open Safari and visit the app URL
3. You may see a notification that there's an update - refresh the page
4. The new version will install automatically

Or simply:
- Delete the home screen icon
- Re-add it using the steps above

---

## Troubleshooting

### "App won't install" or "Add to Home Screen is grayed out"
- Make sure you're using **Safari** (not Chrome or another browser)
- Make sure you're on a real website (not viewing a file:// URL)

### "App looks weird/broken after adding to home screen"
- Delete the home screen icon
- Clear Safari cache: Settings → Safari → Clear History and Website Data
- Re-add the app using the steps above

### "Character data not saving"
- Check if you have internet connection for cloud sync
- Make sure you're logged in (if authentication is enabled)
- Try exporting your character JSON as a backup

### "Can't upload character portrait"
- When prompted, tap "Allow" for photo access
- Go to Settings → Safari → Photos → set to "Allow"

### "Real-time sync with MC not working"
- Make sure you have internet connection
- Check that you're connected to the same campaign as your MC
- Look for the sync status badge at the top (should be green when connected)

---

## Differences from Android App

The iOS PWA experience is nearly identical to the Android Capacitor app:

| Feature | iOS PWA | Android App |
|---------|---------|-------------|
| Home screen icon | ✅ | ✅ |
| Full-screen mode | ✅ | ✅ |
| Offline support | ✅ | ✅ |
| Character management | ✅ | ✅ |
| Cloud sync | ✅ | ✅ |
| MC real-time sync | ✅ | ✅ |
| Portrait uploads | ✅ | ✅ |
| Background refresh | ⚠️ Limited | ✅ Full |
| Push notifications | ❌ Not supported | ✅ Supported |

The main difference is that iOS PWAs have more restrictions on background activity and push notifications. For your use case (playing during a game session), this shouldn't matter at all!

---

## Privacy & Data

- **No App Store tracking** - Since this isn't from the App Store, no Apple tracking
- **Same data as Android** - Your character data works across all devices
- **Cloud save optional** - You can disable automatic cloud save in settings
- **Offline-first** - App works offline after first load

---

## Need Help?

Ask your GM or check the main documentation in the `/docs` folder of the project.

---

**Enjoy playing QUEERZ! on your iPhone!** 🌈📱
