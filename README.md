# Fleet Dashboard

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [Build & Minification](#build--minification)
- [Known Issues](#known-issues)
- [Development vs Production](#development-vs-production)
- [Quick Reference Commands](#quick-reference-commands)
- [Future Enhancements / Roadmap](#future-enhancements--roadmap)
- [Support & Troubleshooting](#support--troubleshooting)

---

## Overview

Fleet Monitoring Dashboard is a web-based application for tracking excavator and dump truck fleet data with payload analysis and reporting capabilities.

**Key Features:**
- PDF data import and extraction
- Real-time payload analysis
- Excel export functionality
- Print and share capabilities
- Responsive design for mobile and desktop

---

## Project Structure

```
fleet-payload/
├── index.html              # Production HTML
├── index-dev.html          # Development HTML
├── js/
│   ├── config.js          # Application configuration
│   ├── utils.js           # Utility functions
│   ├── pdf-text-extractor.js  # PDF parsing logic
│   ├── dashboard.js       # Main application logic
│   └── *.min.js          # Minified JavaScript files
├── style/
│   ├── dashboard.css      # Custom styles
│   ├── tw.css            # Generated Tailwind CSS
│   └── *.min.css         # Minified CSS files
├── package.json           # Node dependencies
└── node_modules/          # Installed packages
```

---

## Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Git (optional, for version control)

### Installation Steps

1. **Navigate to project directory:**
   ```bash
   cd fleet-payload
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

   This will install:
   - Tailwind CSS v4
   - Terser (JavaScript minifier)
   - clean-css-cli (CSS minifier)
   - html-minifier-terser (HTML minifier)

### Git Setup (Recommended)

A `.gitignore` file is included in the project root with best practices for:
- Excluding `node_modules/`
- Ignoring generated/minified files (`.min.js`, `.min.css`, `.min.html`)
- Ignoring generated Tailwind CSS (`tw.css`, `tw.min.css`)
- Excluding IDE-specific files (`.vscode/`, `.idea/`, etc.)
- Excluding OS-specific files (`.DS_Store`, `Thumbs.db`)
- Excluding environment files (`.env`)

**Initialize Git repository:**
```bash
git init
git add .
git commit -m "Initial commit"
```

**Why generated files are excluded:**
- Minified files can be rebuilt using minification commands
- Generated CSS can be recreated from source files
- Keeps repository size small
- Avoids merge conflicts on generated files
- Only source files are tracked

---

## Running the Application

### Option 1: Using a Local Server (Recommended)

Since the application uses ES modules and loads external resources, you need a local web server:

**Using Python:**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Using Node.js (http-server):**
```bash
# Install globally (one-time)
npm install -g http-server

# Run server
http-server -p 8000
```

**Using PHP:**
```bash
php -S localhost:8000
```

Then open your browser and navigate to:
- Development mode: `http://localhost:8000/index-dev.html`
- Production mode: `http://localhost:8000/index.html`

### Option 2: Using Live Server (VS Code)

If you're using VS Code:
1. Install "Live Server" extension
2. Right-click on `index.html` or `index-dev.html`
3. Select "Open with Live Server"

---

## Build & Minification

### Generate Tailwind CSS

**Single build:**
```bash
npx @tailwindcss/cli -o style/tw.css
```

**Watch mode (auto-rebuild on changes):**
```bash
npx @tailwindcss/cli -o style/tw.css --watch
```

**Minified version:**
```bash
npx @tailwindcss/cli -o style/tw.min.css --minify
```

### Minify JavaScript Files

**Individual files:**
```bash
npx terser js/config.js -o js/config.min.js -c -m
npx terser js/utils.js -o js/utils.min.js -c -m
npx terser js/pdf-text-extractor.js -o js/pdf-text-extractor.min.js -c -m
npx terser js/dashboard.js -o js/dashboard.min.js -c -m
```

**All at once:**
```bash
npx terser js/config.js -o js/config.min.js -c -m && \
npx terser js/utils.js -o js/utils.min.js -c -m && \
npx terser js/pdf-text-extractor.js -o js/pdf-text-extractor.min.js -c -m && \
npx terser js/dashboard.js -o js/dashboard.min.js -c -m
```

**Flags explanation:**
- `-c` = compress
- `-m` = mangle variable names
- `-o` = output file

### Minify CSS Files

**Custom CSS:**
```bash
npx cleancss -o style/dashboard.min.css style/dashboard.css
```

**Watch mode:**
```bash
npx cleancss -o style/dashboard.min.css style/dashboard.css --watch
```

### Minify HTML Files

**Standard minification:**
```bash
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index.min.html index.html
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index-dev.min.html index-dev.html
```

**Aggressive minification:**
```bash
npx html-minifier-terser \
  --collapse-whitespace \
  --remove-comments \
  --remove-optional-tags \
  --remove-redundant-attributes \
  --minify-css true \
  --minify-js true \
  -o index.min.html index.html
```

### Complete Build Process

Run all minification steps at once:

```bash
# Generate Tailwind CSS (minified)
npx @tailwindcss/cli -o style/tw.min.css --minify && \

# Minify custom CSS
npx cleancss -o style/dashboard.min.css style/dashboard.css && \

# Minify JavaScript files
npx terser js/config.js -o js/config.min.js -c -m && \
npx terser js/utils.js -o js/utils.min.js -c -m && \
npx terser js/pdf-text-extractor.js -o js/pdf-text-extractor.min.js -c -m && \
npx terser js/dashboard.js -o js/dashboard.min.js -c -m && \

# Minify HTML files
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index.min.html index.html && \
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index-dev.min.html index-dev.html
```

---

## Known Issues

### Tailwind CSS: Local vs CDN Differences

**Issue:** When switching from Tailwind CDN to locally generated Tailwind CSS, the design may appear different or broken.

**Root Cause:**
1. **Version Differences:**
   - CDN: Tailwind v3.4.17 (specified in your HTML)
   - Local: Tailwind v4.1.13 (installed via npm)

2. **Class Generation:**
   - CDN (v3): Uses JIT engine that scans HTML dynamically at runtime
   - Local (v4): Pre-generates CSS at build time by scanning files

3. **Breaking Changes in v4:**
   - Different default configuration
   - Some utility classes renamed or removed
   - Updated color palette using OKLCH color space
   - Changes to arbitrary values syntax
   - Different handling of dark mode and variants

**Solutions:**

**Option A: Use Tailwind v3 CDN (Current)**
```html
<script src="https://cdn.tailwindcss.com/3.4.17"></script>
```
Pros: Works immediately, no build step needed

Cons: Larger file size, slower initial load, not suitable for production

**Option B: Downgrade to Tailwind v3 locally**
```bash
npm uninstall tailwindcss @tailwindcss/cli
npm install -D tailwindcss@3.4.17
npx tailwindcss init
```

Then create `tailwind.config.js`:
```js
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Create `input.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Build command:
```bash
npx tailwindcss -i input.css -o style/tw.css --watch
```

**Option C: Migrate to Tailwind v4**
- Review all HTML classes against v4 documentation
- Update deprecated classes
- Test thoroughly on all pages
- This requires significant effort for class compatibility

**Recommendation:** For production, either stick with CDN for simplicity OR properly migrate to Tailwind v4 with thorough testing.

### Google Fonts Import Warning

When minifying CSS, you may see:
```
WARNING: Skipping remote @import of "https://fonts.googleapis.com/css2?..."
```

This is **expected behavior**. The `@import` statement remains in the minified CSS and will still load Google Fonts correctly in the browser.

---

## Development vs Production

### Development Mode (`index-dev.html`)

Features:
- Development indicator badge
- Load Sample button
- Clear Data button
- Unminified resources for debugging
- Full comments and formatting

**Resources loaded:**
```html
<link rel="stylesheet" href="/style/dashboard.css" />
<script src="/js/config.js"></script>
<script src="/js/utils.js"></script>
<script src="/js/pdf-text-extractor.js"></script>
<script src="/js/dashboard.js"></script>
```

### Production Mode (`index.html` or `index.min.html`)

Features:
- Development tools hidden
- Minified resources
- Optimized for performance
- Smaller file sizes

**Resources loaded (if using minified):**
```html
<link rel="stylesheet" href="/style/dashboard.min.css" />
<script src="/js/config.min.js"></script>
<script src="/js/utils.min.js"></script>
<script src="/js/pdf-text-extractor.min.js"></script>
<script src="/js/dashboard.min.js"></script>
```

**File Size Comparison:**

| File Type | Development | Minified | Savings |
|-----------|-------------|----------|---------|
| HTML | ~32KB | ~25KB | ~22% |
| JavaScript | ~150KB | ~80KB | ~47% |
| CSS | ~25KB | ~18KB | ~28% |

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Generate Tailwind CSS
npx @tailwindcss/cli -o style/tw.css

# Generate Tailwind CSS (watch mode)
npx @tailwindcss/cli -o style/tw.css --watch

# Minify all files
npx @tailwindcss/cli -o style/tw.min.css --minify && \
npx cleancss -o style/dashboard.min.css style/dashboard.css && \
npx terser js/config.js -o js/config.min.js -c -m && \
npx terser js/utils.js -o js/utils.min.js -c -m && \
npx terser js/pdf-text-extractor.js -o js/pdf-text-extractor.min.js -c -m && \
npx terser js/dashboard.js -o js/dashboard.min.js -c -m && \
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index.min.html index.html

# Start development server (Python)
python -m http.server 8000

# Start development server (Node.js)
npx http-server -p 8000

# Git commands
git init                          # Initialize repository
git add .                         # Stage all changes
git commit -m "message"          # Commit changes
git status                       # Check status
git log --oneline                # View commit history
```

---

## Future Enhancements / Roadmap

### 1. Migrate to Tailwind v4 Locally

**Priority:** Medium

**Status:** Pending

**Description:**
Currently, the project uses Tailwind CSS CDN (v3.4.17) due to compatibility issues. Migrating to locally generated Tailwind v4.1.13 would provide:
- Better performance (smaller file size)
- No external CDN dependency
- Offline functionality
- Production-ready optimization

**Tasks:**
- [ ] Audit all Tailwind classes in HTML files
- [ ] Update deprecated v3 classes to v4 equivalents
- [ ] Test color classes (v4 uses OKLCH color space)
- [ ] Verify responsive breakpoints work correctly
- [ ] Test dark mode if applicable
- [ ] Update arbitrary value syntax if used
- [ ] Generate and test minified v4 CSS
- [ ] Update documentation with v4 build commands

**Estimated Effort:** 4-6 hours

---

### 2. Implement Full Bilingual Support (Indonesian & English)

**Priority:** High

**Status:** Pending

**Description:**
Currently, the application has mixed Indonesian and English text throughout the interface. Implementing proper bilingual support would improve user experience and accessibility.

**Current Issues:**
- Mixed language in UI elements (e.g., "Masukkan kata kunci pencarian..." mixed with "Import PDF")
- Hardcoded text strings in HTML
- No language switching mechanism
- Inconsistent language usage across features

**Tasks:**
- [ ] Create language configuration files (`js/lang/id.js`, `js/lang/en.js`)
- [ ] Extract all hardcoded text strings into translation keys
- [ ] Add language switcher UI component (ID/EN toggle)
- [ ] Implement language persistence (localStorage)
- [ ] Update all HTML elements with data-i18n attributes
- [ ] Create language initialization system in `config.js`
- [ ] Update modal dialogs with bilingual support
- [ ] Translate status messages and error messages
- [ ] Update print/export templates with selected language
- [ ] Test all features in both languages
- [ ] Update documentation with language configuration guide

**Example Implementation:**
```javascript
// js/lang/id.js
const translations_id = {
  'importPDF': 'Import PDF',
  'exportExcel': 'Ekspor Excel',
  'printReport': 'Cetak Laporan',
  'searchPlaceholder': 'Masukkan kata kunci pencarian...',
  // ... more translations
};

// js/lang/en.js
const translations_en = {
  'importPDF': 'Import PDF',
  'exportExcel': 'Export Excel',
  'printReport': 'Print Report',
  'searchPlaceholder': 'Enter search keywords...',
  // ... more translations
};
```

**Estimated Effort:** 6-8 hours

---

## Support & Troubleshooting

### Issue: Module not found errors
**Solution:** Make sure you're running the app through a web server, not directly opening the HTML file.

### Issue: PDF import not working
**Solution:** Check browser console for errors. Ensure PDF.js CDN is loading correctly.

### Issue: Styles look broken
**Solution:** Verify that CSS files are being loaded correctly. Check browser network tab.

### Issue: JavaScript errors
**Solution:** Ensure all script files are loaded in the correct order (config → utils → pdf-text-extractor → dashboard).

---

## License

This project is for internal use. All rights reserved.

## Author

www.asa.sh

---

**Last Updated:** November 2025

**Version:** 1.1.0
