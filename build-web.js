const fs = require('fs');
const path = require('path');

const root = __dirname;
const outputDir = path.join(root, 'dist');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');

let index = read('Index.html');
const replacements = {
  "<?!= include('Tailwind'); ?>": read('Tailwind.html'),
  "<?!= include('Theme'); ?>": read('Theme.html'),
  "<?!= include('Logo'); ?>": read('Logo.html').trim(),
  "<?!= include('App'); ?>": `${read('WebBridge.html')}\n${read('App.html')}`,
};

for (const [placeholder, contents] of Object.entries(replacements)) {
  if (!index.includes(placeholder)) throw new Error(`Missing template placeholder: ${placeholder}`);
  index = index.replace(placeholder, contents);
}

const config = read('web.config.js');
index = index.replace('</head>', `  <script>\n${config}\n  </script>\n</head>`);

fs.mkdirSync(outputDir, {recursive: true});
fs.writeFileSync(path.join(outputDir, 'index.html'), index, 'utf8');
fs.writeFileSync(path.join(outputDir, '.nojekyll'), '', 'utf8');
console.log(`Built ${path.join('dist', 'index.html')} (${Buffer.byteLength(index)} bytes)`);
