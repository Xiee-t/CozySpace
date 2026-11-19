import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');

// Clean and recreate dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy public directory if exists
const publicDir = path.resolve('public');
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
}

// Remove legacy PHP entry from dist if copied from public
const phpEntry = path.join(distDir, 'index.php');
if (fs.existsSync(phpEntry)) {
  fs.rmSync(phpEntry);
}

// Files to copy directly to dist (overwrites with latest root files)
const filesToCopy = ['index.html', 'style.css', 'app.js', 'supabase.js'];
for (const file of filesToCopy) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
  }
}

console.log('✓ CozySpace frontend static build created in dist/');
