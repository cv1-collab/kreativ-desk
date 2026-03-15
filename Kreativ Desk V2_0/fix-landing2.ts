import * as fs from 'fs';

let content = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

content = content.replace(/hover:hover:/g, 'hover:');
content = content.replace(/hover:-translate-y-0\.shadow-neon-brand/g, 'hover:-translate-y-0.5 shadow-neon-brand');
content = content.replace(/selection:bg-tech-grid/g, 'selection:text-text-primary bg-tech-grid');

fs.writeFileSync('src/components/LandingPage.tsx', content);
