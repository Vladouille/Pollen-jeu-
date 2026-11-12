# POLLEN v8 : où mettre les modèles

Le jeu charge de vrais modèles 3D au lieu de les dessiner. Dépose les fichiers ici, avec exactement ces noms :

```
v8/
  index.html
  models/
    fleur_lavande.glb     une plante (l'instance est répétée 20 à 40 fois par tuile)
    marche.glb            l'étal du marché, façade vers +Z
    atelier.glb           l'établi sous appentis, façade vers +Z
    outil_coton.glb       la tige de coton
    outil_pinceau.glb     le pinceau
  hdri/
    ciel.hdr              un ciel de campagne, 2K suffit
```

Sources CC0 conseillées : quaternius.com (format GLB), kenney.nl, polyhaven.com (HDRI).
`fleur_tournesol.glb` et `ruche.glb` ne servent pas encore : ils viendront avec la deuxième espèce et les ruches.

## Ce que le jeu fait de chaque fichier

- Les modèles sont remis à l'échelle tout seuls : la fleur à 55 cm de haut, le marché à 5 m de large,
  l'atelier à 4,5 m, les outils à 30 cm de long (leur plus grande dimension devient l'axe de l'outil).
- La façade d'un bâtiment est son côté +Z : elle est tournée vers le point de départ.
- Le rayon des fleurs détaillées s'adapte au nombre de triangles du modèle de fleur.
- Un fichier absent n'arrête rien : une forme de substitution le remplace, et un message dit lequel manque.

## Lancer le jeu

Un double-clic sur `index.html` ne marche pas : le navigateur bloque le chargement des modèles.
Il faut un petit serveur :

- itch.io : nouveau projet HTML, envoyer le dossier `v8` compressé en zip. Le lien marche sur PC et téléphone.
- VS Code : extension Live Server, clic droit sur `index.html`, « Open with Live Server ».
- Terminal, dans le dossier `v8` : `python -m http.server`, puis ouvrir `localhost:8000`.

Test automatique : `npm run smoke:v8` (avec des fichiers de test dans `tests/fixtures/v8`, puis sans aucun fichier).
