# Fleet Dashboard

## Minify JS

```bash
npx terser js/config.js -o js/config.min.js -c -m
npx terser js/utils.js -o js/utils.min.js -c -m
npx terser js/pdf-text-extractor.js -o js/pdf-text-extractor.min.js -c -m
npx terser js/dashboard.js -o js/dashboard.min.js -c -m
```

## Minify CSS

```bash
npx cleancss -o style/dashboard.min.css style/dashboard.css
npx cleancss -o style/tw.min.css style/tw.css
```

## Minify HTML

```bash
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index.min.html index.html
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o index-dev.min.html index-dev.html
```
