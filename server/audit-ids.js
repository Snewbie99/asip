const fs = require('fs');
const path = require('path');

const routesDir = 'c:/Users/HYRA/Documents/PROJECT/ASIPP/server/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if ((line.includes('.create({') || line.includes('.upsert({')) && !line.includes('id: crypto.randomUUID()') && !line.includes("id: 'default'") && !line.includes('id: u.id')) {
      // Check if ID is in following lines
      let hasId = false;
      for (let j = 1; j < 10 && (i + j) < lines.length; j++) {
        const nextLine = lines[i + j];
        if (nextLine.includes('id: crypto.randomUUID()') || nextLine.includes("id: 'default'") || nextLine.includes('id: ') || nextLine.includes('id,')) {
          hasId = true;
          break;
        }
        if (nextLine.includes('})')) break;
      }
      if (!hasId) {
        console.log(`Potential missing ID in ${file}:${i + 1}: ${line.trim()}`);
      }
    }
  });
});
