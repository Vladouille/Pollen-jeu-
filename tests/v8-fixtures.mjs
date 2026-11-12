// Fabrique des fichiers de test pour la v8 (GLB et HDR), à la place des vrais modèles CC0
// que le fondateur dépose dans v8/models et v8/hdri. Ce ne sont que des formes simples :
// elles servent à vérifier que le chargement, les instances et les bâtiments marchent.
// Lancer : node tests/v8-fixtures.mjs
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)), out = join(root, 'tests', 'fixtures', 'v8');
const three = await readFile(join(root, 'vendor', 'three.module.min.js'));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext()).newPage();
await page.route('https://x/**', async (r) => { const u = r.request().url(); if (u.endsWith('/three.js')) return r.fulfill({ body: three, contentType: 'text/javascript' }); const m = u.match(/jsm\/(.*)$/); return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); });
await page.setContent('<script type="importmap">{"imports":{"three":"https://x/three.js","three/addons/":"https://x/jsm/"}}</script>');
const fichiers = await page.evaluate(async () => {
  const THREE = await import('three'); const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
  const modeles = {
    fleur_lavande: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.5, 6), M(0x6b8a62), 0, 0.25)); g.add(mesh(new THREE.CapsuleGeometry(0.015, 0.1, 3, 8), M(0x7d5fd0), 0, 0.5)); return g; },
    marche: () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(4, 1, 1.2), M(0xa87850), 0, 0.5)); g.add(mesh(new THREE.BoxGeometry(4.4, 0.1, 2), M(0xc04a40), 0, 2.6)); return g; },
    atelier: () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(3.6, 0.1, 1), M(0x9a6a40), 0, 0.92)); g.add(mesh(new THREE.BoxGeometry(4, 2.6, 0.2), M(0x8a6040), 0, 1.3, -0.8)); return g; },
    outil_coton: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.25, 6), M(0xf0ece0))); g.add(mesh(new THREE.SphereGeometry(0.012, 8, 6), M(0xf3e2b0), 0, 0.13)); return g; },
    outil_pinceau: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.24, 8), M(0xb07646))); g.add(mesh(new THREE.ConeGeometry(0.012, 0.05, 8), M(0xe2c27a), 0, 0.14)); return g; },
  };
  const res = {};
  for (const [nom, f] of Object.entries(modeles)) {
    const buf = await new GLTFExporter().parseAsync(f(), { binary: true });
    res[nom] = Array.from(new Uint8Array(buf));
  }
  return res;
});
for (const [nom, octets] of Object.entries(fichiers)) await writeFile(join(out, 'models', nom + '.glb'), Buffer.from(octets));
// Un ciel HDR minuscule (format Radiance, lignes non compressées) : bleu en haut, chaud à l'horizon.
const L = 8, Hh = 4, rgbe = (r, g, b) => { const v = Math.max(r, g, b), e = Math.ceil(Math.log2(v)), s = 256 / 2 ** e; return [r * s, g * s, b * s, e + 128].map(Math.floor); };
const px = []; for (let y = 0; y < Hh; y++) for (let x = 0; x < L; x++) px.push(...(y < 2 ? rgbe(0.5, 0.7, 1.2) : rgbe(1.4, 1.1, 0.8)));
await writeFile(join(out, 'hdri', 'ciel.hdr'), Buffer.concat([Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${Hh} +X ${L}\n`), Buffer.from(px)]));
await browser.close();
console.log('fixtures écrites dans', out);
