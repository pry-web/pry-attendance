const fs = require('fs');
const path = require('path');

const root = __dirname;
const outputDir = path.join(root, 'dist');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');

let index = read('Index.html');
const appSource = read('App.html');
const replacements = {
  "<?!= include('Tailwind'); ?>": read('Tailwind.html'),
  "<?!= include('Theme'); ?>": read('Theme.html'),
  "<?!= include('Logo'); ?>": read('Logo.html').trim(),
  "<?!= include('Favicon'); ?>": 'assets/norsur-favicon.png',
  "<?!= include('App'); ?>": `${read('WebBridge.html')}\n${appSource}`,
};

for (const [placeholder, contents] of Object.entries(replacements)) {
  if (!index.includes(placeholder)) throw new Error(`Missing template placeholder: ${placeholder}`);
  // Use a replacer function so JavaScript sequences such as `$$` are copied
  // literally. Passing the file contents as a replacement string makes
  // String.replace interpret `$$` as a single dollar sign and corrupts App.js.
  index = index.split(placeholder).join(contents);
}

const config = read('web.config.js');
index = index.replace('</head>', () => `  <script>\n${config}\n  </script>\n</head>`);

if (!index.includes(appSource)) {
  throw new Error('The embedded App.html source was altered during the web build.');
}
if (index.includes('<?!=')) {
  throw new Error('The web build still contains unresolved Apps Script template directives.');
}

fs.mkdirSync(outputDir, {recursive: true});
fs.cpSync(path.join(root, 'assets'), path.join(outputDir, 'assets'), {recursive: true});
fs.writeFileSync(path.join(outputDir, 'index.html'), index, 'utf8');
fs.writeFileSync(path.join(outputDir, '.nojekyll'), '', 'utf8');
console.log(`Built ${path.join('dist', 'index.html')} (${Buffer.byteLength(index)} bytes)`);
