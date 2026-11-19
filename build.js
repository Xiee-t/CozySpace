import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');

// Clean and recreate dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy public directory if exists (favicons, robots, assets)
const publicDir = path.resolve('public');
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
}

// Frontend files to copy directly to dist
const filesToCopy = ['index.html', 'style.css', 'app.js', 'supabase.js'];
for (const file of filesToCopy) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
  }
}

console.log('✓ CozySpace 100% JavaScript static build created in dist/');
