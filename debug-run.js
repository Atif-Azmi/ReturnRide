const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('node --env-file=.env index.mjs', { encoding: 'utf-8' });
  fs.writeFileSync('error.txt', "Output was successful:\n" + output, 'utf-8');
} catch (error) {
  fs.writeFileSync('error.txt', error.stderr ? error.stderr.toString() : error.message, 'utf-8');
}
