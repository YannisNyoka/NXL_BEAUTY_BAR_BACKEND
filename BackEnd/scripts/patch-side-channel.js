const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '../node_modules/side-channel-list/index.js');
if (fs.existsSync(target)) {
  let code = fs.readFileSync(target, 'utf8');
  if (!code.includes('try { $TypeError = require')) {
    code = code.replace(
      /var \$TypeError = require\('es-errors\/type'\);/,
      "var $TypeError; try { $TypeError = require('es-errors/type'); } catch (e) { $TypeError = typeof TypeError !== 'undefined' ? TypeError : Error; }"
    );
    fs.writeFileSync(target, code, 'utf8');
    console.log('patch-side-channel: applied patch');
  } else {
    console.log('patch-side-channel: already patched or pattern not found');
  }
} else {
  console.log('patch-side-channel: target file not found');
}
