import fs from 'fs';
import path from 'path';

const colorsToReplace = {
  '#606C38': '#2563EB',
  '#4E582E': '#1D4ED8',
  '#F9F8F6': '#F9FAFB',
  '#E5E4E2': '#E5E7EB',
  '#E9EDC9': '#DBEAFE',
  '#2D2D2A': '#111827',
  '#BC6C25': '#0EA5E9',
  '#DDA15E': '#38BDF8',
  '#3F3F3B': '#374151' // replacing dark button hover
};

function walkDir(dir: string, callback: (filepath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', (filepath) => {
  if (filepath.endsWith('.tsx') || filepath.endsWith('.ts') || filepath.endsWith('.css')) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;
    for (const [before, after] of Object.entries(colorsToReplace)) {
      if (content.includes(before) || content.includes(before.toLowerCase())) {
        content = content.replace(new RegExp(before, 'g'), after);
        content = content.replace(new RegExp(before.toLowerCase(), 'g'), after);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(filepath, content, 'utf8');
      console.log('Replaced colors in', filepath);
    }
  }
});
