// webpack-jsdom-patch.js
const path = require('path');
const fs = require('fs');

// based on https://github.com/jsdom/jsdom/issues/3951#issuecomment-3604153303
module.exports = function (src) {
  const defaultCSSPath = path.join(
    path.dirname(this.resourcePath),
    '../../browser/default-stylesheet.css',
  );
  const defaultCSS = fs.readFileSync(defaultCSSPath, 'utf-8');
  const updatedSrc = src.replace(
    /const defaultStyleSheet[^;]*/,
    `const defaultStyleSheet = ${JSON.stringify(defaultCSS)}`,
  );
  return updatedSrc;
};