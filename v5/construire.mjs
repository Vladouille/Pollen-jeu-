// Assemble les deux fichiers livrés à partir des mêmes sources :
//   v5/pollen-pc.html     = modele.html + config-pc.js     + jeu.js
//   v5/pollen-mobile.html = modele.html + config-mobile.js + jeu.js
// Le code de jeu (jeu.js) est écrit une seule fois et recopié tel quel dans les deux.
// Lancer : node v5/construire.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('.', import.meta.url));
const modele = await readFile(join(dir, 'src', 'modele.html'), 'utf8');
const jeu = await readFile(join(dir, 'src', 'jeu.js'), 'utf8');
for (const cible of ['pc', 'mobile']) {
  const config = await readFile(join(dir, 'src', `config-${cible}.js`), 'utf8');
  const html = modele.replace('/*__CONFIG__*/', () => config).replace('/*__JEU__*/', () => jeu);
  await writeFile(join(dir, `pollen-${cible}.html`), html);
  console.log(`v5/pollen-${cible}.html : ${(html.length / 1024).toFixed(0)} Ko`);
}
