# Meet42

> Connecter 4 à 6 inconnus autour d'une activité réelle en ville.

**[🚀 Demo live](https://meet42-phi.vercel.app)**

---

## Le problème

Les apps sociales sont pensées pour scroller, pas pour se rencontrer. Résultat : des milliers de connexions, zéro vraie rencontre. Meet42 renverse cette logique — pas de matching infini, pas de chat sans fin. Juste un plan, une date, un groupe de 4 à 6 personnes.

## Comment ça marche

1. Tu proposes ou rejoins une activité IRL (escalade, resto, balade, etc.)
2. Le groupe se forme automatiquement à 4 participants
3. Si le groupe n'est pas complet 24h avant, le plan est annulé — pas de no-show, pas de faux espoirs
4. Tout le monde se retrouve au même endroit, au même moment

## Features

- 🗺️ Géolocalisation pour découvrir les activités proches
- 👥 Groupes fixes de 4 à 6 personnes
- ⏱️ Logique d'annulation automatique à 24h
- 🔐 Auth sociale Google & Facebook (OAuth via Supabase)
- 📱 UI responsive, pensée mobile-first

## Stack technique

| Côté | Techno |
|------|--------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| Auth | OAuth Google + Facebook |
| Deploy | Vercel |

## Lancer en local

```bash
git clone https://github.com/Fliwer/-Meet42
cd -Meet42
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

Crée un fichier `.env.local` à partir de `.env.example` et configure tes clés Supabase.

Sans Supabase configuré, l'app tourne en mode mock avec des données locales.

## Contexte

Meet42 est mon projet de fin d'études dans le cadre de ma formation fullstack JavaScript chez [DigitalCity Bruxelles](https://digitalcity.brussels). L'idée est née d'un constat simple : après un an de van life en Nouvelle-Zélande, les meilleures rencontres se font toujours autour d'une activité concrète, jamais derrière un écran.

---

Construit par [Polo](https://github.com/Fliwer) · Bruxelles, 2026