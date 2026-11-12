# Simulation grossière de la progression : un joueur qui achète au mieux, saison après saison.
import math, sys
NT = 653670; SECT = 550
def prix_rang(r):
    return 3 if r < 1 else 7 if r < 3 else 15 if r < 8 else 32 if r < 20 else 70 if r < 60 else 150
NS = int(sys.argv[1]) if len(sys.argv) > 1 else 25
SEUILS = [min(1, 0.02 * 1.5 ** s) for s in range(NS)]
PAS_SAISON = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
EFF_PILOTE = 0.5 * 0.55   # le pilote roule à 55 % de la vitesse
EFF_JOUEUR = 0.7   # trajets, demi-tours, quai
# (nom, prix, débit en parcelles/s si conduit par le joueur, pilotable)
OUTILS = [('pinceau',0,0.25),('brosse',250,0.6),('large',1200,1.2),('xl',3200,2.0),('souffleur',8000,3.0)]
VEH = [('chariot',900,1.5),('pollinisatrice',45000,6.5),('moto',35000,9.0),('transporteur',300000,9.7),('geante',1500000,15),('aeroglisseur',5000000,38)]
def prix_tuile(n, mult):   # la n-ième parcelle pollinisée vaut selon le rang de son secteur (au plus près d'abord)
    return prix_rang(int(n // SECT)) * mult
rech = [0, 0, 0]; PRIX_R = [20000, 30000, 50000]
t = 0.0; cr = 0.0; saison = 0; n = 0; outil = 0.25; possede = set(); pilotes = set(); robots = 0; toit = 0
dt = 5.0; log = []
while saison < len(SEUILS):
    mult = (1 + PAS_SAISON * saison) * (1 + 0.05 * rech[2])
    meilleur_veh = max([d for (k,p,d) in VEH if k in possede] + [0])
    joueur = max(outil, meilleur_veh) * EFF_JOUEUR
    auto = sum(d for (k,p,d) in VEH if k in pilotes and k != max(((d,k) for (k,p,d) in VEH if k in possede), default=(0,''))[1]) * EFF_PILOTE * (1 + 0.06 * rech[1]) + robots * 0.2 * (1 + 0.05 * rech[0])
    debit = joueur + auto
    gain = debit * dt * prix_tuile(n, mult) + [0, 8, 32, 104][toit] * 0.5 * dt
    charges = (6 * 0.6 + 13 * 0.25 + robots * 0.3 * 0.25) if robots else 0   # usine de six ouvriers, recharge des robots
    cr += gain - charges * dt; n += debit * dt; t += dt
    # achats : le meilleur rapport débit/prix abordable
    choix = []
    for (k,p,d) in OUTILS:
        if d > outil and cr >= p: choix.append((d - outil, p, ('outil', d)))
    for (k,p,d) in VEH:
        if k not in possede and cr >= p: choix.append((max(0, d - max(outil, meilleur_veh)) + 0.01, p, ('veh', k)))
        if k in possede and k not in pilotes and cr >= p * 0.3: choix.append((d * EFF_PILOTE, p * 0.3, ('pilote', k)))
    pr = 2500 * 1.35 ** robots
    if robots < 40 and cr >= pr: choix.append((0.2, pr, ('robot',)))
    tp = [6000, 30000, 150000]
    for i in range(3):
        pr_ = PRIX_R[i] * 2.0 ** rech[i]
        if cr >= pr_: choix.append(([0.35 * 0.08 * robots, 0.06 * 5, 0.05 * 20][i], pr_, ('rech', i)))
    if toit < 3 and cr >= tp[toit]: choix.append((0.2, tp[toit], ('toit',)))
    if choix:
        choix.sort(key=lambda c: -c[0] / max(1, c[1]))
        d, p, a = choix[0]; cr -= p
        if a[0] == 'outil': outil = a[1]
        elif a[0] == 'veh': possede.add(a[1])
        elif a[0] == 'pilote': pilotes.add(a[1])
        elif a[0] == 'robot': robots += 1
        elif a[0] == 'toit': toit += 1
        elif a[0] == 'rech': rech[a[1]] += 1
    if n >= SEUILS[saison] * NT or n >= NT:
        log.append((saison + 1, round(t / 3600, 1), int(n), robots, len(possede), len(pilotes)))
        saison += 1; n = 0
    if t > 3600 * 400: break
for l in log: print('saison %d close à %.1f h (%d parcelles), robots %d, véhicules %d, pilotes %d' % l)
print('recherche', rech)
print('total : %.1f h' % (t / 3600))
