#!/bin/bash
# build-tampermonkey.sh
# Concatenate all dashboard files into a single userscript for Tampermonkey

set -e

OUT=output/github-actions-dashboard.user.js

# Add userscript header from src/index.js
head -n 11 src/index.js > $OUT

echo "" >> $OUT
echo "(function() {" >> $OUT
echo "'use strict';" >> $OUT

# Add CSS as a JS string and inject it
echo "    // Inject dashboard CSS" >> $OUT
echo "    let css = \`" >> $OUT
cat src/dashboard-style.css >> $OUT
echo "\`;" >> $OUT
echo "    const style = document.createElement('style');" >> $OUT
echo "    style.textContent = css;" >> $OUT
echo "    document.head.appendChild(style);" >> $OUT

echo "" >> $OUT

# Add utils (remove export)
sed '/^export /s/export //' src/dashboard-utils.js >> $OUT

echo "" >> $OUT

# Add UI logic (remove import/export)
sed '/^import /d; /^export /s/export //' src/dashboard-ui.js >> $OUT

echo "" >> $OUT

# Add main logic (skip header and imports)
awk 'NR>11 && !/^import / {print}' src/index.js >> $OUT

echo "})();" >> $OUT

echo "Build complete: $OUT"
