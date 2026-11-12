// Assemble v9/index.html à partir de v9/src : le modèle HTML et les morceaux de code, dans l'ordre de leur nom.
// Un seul fichier livré ; le code est découpé en morceaux pour rester lisible. Lancer : node v9/construire.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const dir = fileURLToPath(new URL('.', import.meta.url)), src = join(dir, 'src');
const morceaux = (await readdir(src)).filter((f) => f.endsWith('.js')).sort();
const code = (await Promise.all(morceaux.map((f) => readFile(join(src, f), 'utf8')))).join('\n');
const html = (await readFile(join(src, 'modele.html'), 'utf8')).replace('/*__CODE__*/', () => code);
await writeFile(join(dir, 'index.html'), html);
console.log(`v9/index.html : ${(html.length / 1024).toFixed(0)} Ko (${morceaux.join(', ')})`);
