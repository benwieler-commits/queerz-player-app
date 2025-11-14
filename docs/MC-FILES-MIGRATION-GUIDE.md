# 🎭 MC App Files - Migration Guide

## Overview

This guide helps you move all MC-related files to a separate repository or organize them within this repo.

---

## 📦 MC App Files List

### **Core MC Files**

```
mc-index.html                    # Minimal HTML (uses integrated JS)
mc-app-integrated.js             # Complete MC app with HTML embedded
campaign-manager-mc.js           # MC-only campaign functions
styles-mc.css                    # MC app styling
```

### **Alternative (Separate HTML)**

```
mc-app.html                      # Full HTML structure (alternative)
mc-app.js                        # MC app logic (alternative)
```

### **Documentation**

```
MC-SETUP-GUIDE.md                # Complete MC setup guide
MC-FILES-MIGRATION-GUIDE.md      # This file
```

### **Shared Files (Needed by Both MC and Player Apps)**

```
firebase-config.js               # Firebase configuration
```

### **Original Campaign Files (Keep in Player App OR Move to Shared)**

```
campaign-manager.js              # Original unified version
campaign-manager-player.js       # Player-only functions
CAMPAIGN-GUIDE.md                # General campaign guide
CAMPAIGN-QUICK-REFERENCE.md      # Quick reference
campaign-ui-snippet.html         # Player UI components
```

---

## 🎯 Migration Options

### **Option 1: Create Separate MC App Repository**

**Steps:**

1. **Create new repository** (e.g., `queerz-mc-app`)

2. **Copy these files to new repo:**
   ```
   mc-index.html
   mc-app-integrated.js
   campaign-manager-mc.js
   styles-mc.css
   firebase-config.js  (copy this)
   MC-SETUP-GUIDE.md
   ```

3. **Update firebase-config.js** in new repo:
   - Make sure it works standalone
   - Ensure Firebase credentials are correct

4. **Update imports** in mc-app-integrated.js if needed

5. **Remove from player app repo:**
   ```bash
   git rm mc-app.html mc-app.js mc-app-integrated.js mc-index.html
   git rm campaign-manager-mc.js styles-mc.css MC-SETUP-GUIDE.md
   git commit -m "Move MC files to separate repository"
   ```

### **Option 2: Organize Within This Repository**

Create directory structure:

```
queerz-player-app/
  ├── player/
  │   ├── index.html
  │   ├── player-app.js
  │   ├── campaign-manager-player.js
  │   └── styles-player.css
  │
  ├── mc/
  │   ├── index.html (renamed from mc-index.html)
  │   ├── mc-app-integrated.js
  │   ├── campaign-manager-mc.js
  │   └── styles-mc.css
  │
  ├── shared/
  │   ├── firebase-config.js
  │   └── assets/
  │
  └── docs/
      ├── MC-SETUP-GUIDE.md
      ├── CAMPAIGN-GUIDE.md
      └── CAMPAIGN-QUICK-REFERENCE.md
```

**Steps:**

```bash
# Create directories
mkdir player mc shared docs

# Move player files
mv index.html player/
mv player-app.js player/
mv campaign-manager-player.js player/
mv styles-player.css player/

# Move MC files
mv mc-index.html mc/index.html
mv mc-app-integrated.js mc/
mv campaign-manager-mc.js mc/
mv styles-mc.css mc/

# Move shared files
mv firebase-config.js shared/

# Move docs
mv *.md docs/

# Update import paths in all files
```

### **Option 3: Keep Integrated in One File (Recommended for Now)**

**Use:** `mc-index.html` + `mc-app-integrated.js`

This approach:
- ✅ Single HTML file with minimal markup
- ✅ All UI logic in JavaScript
- ✅ Easy to move to separate repo later
- ✅ Self-contained MC app

**Files needed:**
```
mc-index.html
mc-app-integrated.js
campaign-manager-mc.js
styles-mc.css
firebase-config.js
```

---

## 🚀 Quick Setup for Separate MC Repo

### **Create New Repository**

```bash
# On GitHub or your git host
# Create new repo: queerz-mc-app

# Clone it locally
cd /home/user
git clone <your-mc-app-repo-url>
cd queerz-mc-app
```

### **Copy MC Files**

```bash
# Copy from player app repo
cp /home/user/queerz-player-app/mc-index.html ./index.html
cp /home/user/queerz-player-app/mc-app-integrated.js ./mc-app.js
cp /home/user/queerz-player-app/campaign-manager-mc.js ./
cp /home/user/queerz-player-app/styles-mc.css ./
cp /home/user/queerz-player-app/firebase-config.js ./
cp /home/user/queerz-player-app/MC-SETUP-GUIDE.md ./README.md
```

### **Update Import Paths**

In `mc-app.js` (if paths changed):
```javascript
// Update these imports if needed
import { ... } from './campaign-manager-mc.js';
import { ... } from './firebase-config.js';
```

### **Commit and Push**

```bash
git add .
git commit -m "Initial MC app setup with integrated UI"
git push origin main
```

---

## 📋 File Dependencies

### **MC App Requires:**

1. **mc-index.html** → Loads:
   - `firebase-config.js`
   - `mc-app-integrated.js`

2. **mc-app-integrated.js** → Imports from:
   - `campaign-manager-mc.js`
   - `firebase-config.js`

3. **campaign-manager-mc.js** → Imports from:
   - `firebase-config.js`

4. **styles-mc.css** → Linked in HTML

### **Dependency Graph:**

```
mc-index.html
├─→ styles-mc.css
├─→ firebase-config.js
└─→ mc-app-integrated.js
    ├─→ campaign-manager-mc.js
    │   └─→ firebase-config.js
    └─→ firebase-config.js
```

---

## 🔧 Configuration Updates

### **If Moving to Separate Repo**

1. **Update package.json** (if exists):
   ```json
   {
     "name": "queerz-mc-app",
     "description": "QUEERZ! MC Control Panel",
     "version": "1.0.0"
   }
   ```

2. **Update Firebase imports**:
   - Ensure Firebase CDN links work
   - Verify authentication works in new environment

3. **Update README**:
   - Rename `MC-SETUP-GUIDE.md` to `README.md`
   - Add installation instructions
   - Link to player app repo

---

## 🗑️ Cleanup Player App Repo

After moving MC files to separate repo:

```bash
# In player app repo
git rm mc-app.html mc-app.js mc-app-integrated.js mc-index.html
git rm campaign-manager-mc.js styles-mc.css
git rm MC-SETUP-GUIDE.md MC-FILES-MIGRATION-GUIDE.md

# Keep these in player app:
# - player-app.js
# - campaign-manager-player.js
# - index.html
# - styles-player.css
# - firebase-config.js
# - CAMPAIGN-GUIDE.md

git commit -m "Remove MC files (moved to separate repository)"
git push
```

---

## 🔄 Update Cross-References

### **In MC App README** (if separate repo):

```markdown
## Player App

Players use the companion Player App:
[QUEERZ! Player App](https://github.com/benwieler-commits/queerz-player-app)

To connect players:
1. Create campaign in MC App
2. Share Campaign ID
3. Players join via Player App
```

### **In Player App README** (if separate repo):

```markdown
## MC Control Panel

MCs should use the MC Control Panel:
[QUEERZ! MC App](https://github.com/benwieler-commits/queerz-mc-app)

Features:
- Create campaigns
- Manage scenes and chapters
- Track player choices
- Auto-progress storylines
```

---

## ✅ Verification Checklist

After migration:

- [ ] MC app loads in browser
- [ ] Firebase authentication works
- [ ] Campaign creation works
- [ ] Campaign ID can be copied
- [ ] Players can join via Player App using ID
- [ ] Scene broadcasting works
- [ ] Script overlay displays correctly
- [ ] Checkboxes save choices to Firebase
- [ ] Progress bar updates
- [ ] Auto-chapter progression works
- [ ] Session management works

---

## 🆘 Troubleshooting

### **Import Errors**

**Problem:** `Failed to resolve module specifier`

**Solution:** Check import paths in:
- mc-app-integrated.js
- campaign-manager-mc.js

Ensure paths are relative and correct:
```javascript
import { ... } from './firebase-config.js';  // ✅ Correct
import { ... } from 'firebase-config.js';    // ❌ Wrong
```

### **Firebase Connection Errors**

**Problem:** Can't connect to Firebase

**Solution:**
1. Verify `firebase-config.js` exists
2. Check Firebase credentials
3. Verify Firebase Rules allow reads/writes
4. Check browser console for errors

### **Styling Issues**

**Problem:** MC app looks broken

**Solution:**
1. Verify `styles-mc.css` is linked in HTML
2. Check browser console for 404 errors
3. Ensure CSS file path is correct

---

## 💡 Recommended Approach

**For Now:**

Keep everything in player app repo but use:
- `mc-index.html` (minimal HTML)
- `mc-app-integrated.js` (complete app logic)

**Later:**

When ready to fully separate:
1. Create new MC app repository
2. Copy 5 essential files (see above)
3. Update import paths
4. Test thoroughly
5. Clean up player app repo

---

## 📞 Support

If you encounter issues during migration:

1. Check browser console for errors
2. Verify all imports are correct
3. Test Firebase connection
4. Ensure all required files are present

---

## 📚 Additional Resources

- Firebase Console: https://console.firebase.google.com/
- Repository structure best practices
- Git submodules (for shared code)

---

Happy migrating! 🎭✨
