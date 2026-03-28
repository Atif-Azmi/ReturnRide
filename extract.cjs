const fs = require('fs');
const path = require('path');

const mapRaw = fs.readFileSync('index.mjs.map', 'utf8');
const mapData = JSON.parse(mapRaw);

const outputDir = path.join(__dirname, 'recovered_src');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (let i = 0; i < mapData.sources.length; i++) {
  const sourcePath = mapData.sources[i];
  const sourceContent = mapData.sourcesContent ? mapData.sourcesContent[i] : null;

  if (sourceContent && !sourcePath.includes('node_modules')) {
    const fullPath = path.join(outputDir, sourcePath.replace(/(\.\.\/)+/g, ''));
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, sourceContent, 'utf8');
    console.log('Recovered:', sourcePath);
  }
}
console.log('Done mapping.');
