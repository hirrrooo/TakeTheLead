# TakeTheLead

A nonprofit web app that helps pet owners cover urgent vet bills with 30-day fundraising campaigns. Built with SvelteKit 2, Tailwind CSS, and Prisma ORM. The app uses a SQLite database.

## Develop locally

Install [Node.js](https://nodejs.org/en/download) (v24 or later), which includes npm, then run:

```bash
cp .env.example .env    # then set BETTER_AUTH_SECRET (32 chars in production)
npm ci
npm run db:deploy
npm run db:generate
npm run db:seed
npm run dev
```

Open [the brand guidelines](http://localhost:5173/branding). The root page is intentionally blank. Changes in `src/` or `static/` reload automatically. If port 5173 is in use, run `npm run dev -- --port 5174` and open that port instead.

`npm run db:seed` loads the demo data described under [Seed data](#seed-data). It is idempotent, so re-run it any time you want a clean slate. Skip it if you would rather start from an empty database.

Each checkout has its own SQLite database at `prisma/dev.db`. Git ignores the file, so teammates do not share local data. After changing `prisma/schema.prisma`, create a migration with `npm run db:migrate -- --name describe_change`, then run `npm run db:generate`. `npm run db:push` is available for local prototyping; use migrations for changes that should reach production.

## Production database

The Coolify deployment uses SQLite in persistent storage. Keep the app to one replica and back up the mounted data volume. If the app later needs multiple replicas or heavier concurrent writes, move production data to PostgreSQL.

## Deploying to Coolify with Railpack

Create an application in Coolify from this repository and select **Railpack** as the build strategy. Use the repository root as the base directory. Railpack can use the package scripts below, or set them explicitly in the build settings:

| Setting         | Value           |
| --------------- | --------------- |
| Install command | `npm ci`        |
| Build command   | `npm run build` |
| Start command   | `npm run start` |
| Exposed port    | `3000`          |

Add these environment variables in Coolify:

```env
HOST=0.0.0.0
PORT=3000
DATABASE_URL=file:/data/takethelead.db
```

Add persistent storage with the container mount path `/data` and make sure the app can write to it. The database URL points to that volume, so database contents survive rebuilds and redeployments. Do not use the container's writable layer for the database file.

The build generates Prisma Client. The start command applies checked-in migrations with `prisma migrate deploy` before launching the SvelteKit Node server. To change the schema, create a migration locally with `npm run db:migrate -- --name describe_change` and commit the resulting files under `prisma/migrations`; the next deployment applies it automatically. `npm run db:push` remains available for local prototyping.

## Seed data

`prisma/seed-data.ts` holds the demo data and nothing else; `prisma/seed.ts` only validates it and writes it. Field names match `prisma/schema.prisma` exactly, so the seed doubles as documentation of the schema.

| Model           | Rows | Notes                                                            |
| --------------- | ---- | ---------------------------------------------------------------- |
| `User`          | 5    | 4 loginable accounts + a non-loginable `system` user             |
| `Campaign`      | 6    | approved / draft / closed, multi-pet, family co-management       |
| `Donation`      | 27   | guest, anonymous, pending, refunded; `raisedCents` recomputed    |
| `VetHospital`   | 12   | Hampton Roads, VA — ZIP, phone, 24/7 flag, emergency hours       |
| `FundingSource` | 15   | 11 starter + 4 added, every `verifiedAt` hand-checked            |
| `PromiseToPay`  | 6    | one deliberately _unaccepted_ so the approve guard can be demoed |

Plus pets, campaign links, vet records, and a CHANGES_REQUESTED → APPROVED moderation trail. `seed.ts` refuses to run if the data breaks an invariant (money splits, exactly one 24/7 hospital, ZIP and phone formats, unique URLs).

Everything works the same on Linux: `db:seed` runs `tsx prisma/seed.ts`, and the two `.mjs` scripts below run on plain `node` with no build step.

### Demo accounts

The seed creates these loginable accounts (password for all: `password123!`). Sign in at [/demo/better-auth/login](http://localhost:5173/demo/better-auth/login).

| Email                        | Name           | Role                                     |
| ---------------------------- | -------------- | ---------------------------------------- |
| `seed_maria@takethelead.dev` | Maria Alvarez  | Owner of 3 campaigns, co-manager on 2    |
| `seed_james@takethelead.dev` | James Alvarez  | Co-manager (MANAGER) on Bella's campaign |
| `seed_pat@takethelead.dev`   | Pat Nguyen     | Owner of 3 campaigns                     |
| `seed_mod@takethelead.dev`   | Dana Whitfield | Moderator (`isModerator`) — review queue |

A non-loginable `system` user (`id = "system"`) exists to own orphaned campaigns.

### Generated output files

Generated artefacts go in `.db-output/`, which is gitignored and disposable:

```bash
npm run db:export-sql   # -> .db-output/seed.sql (portable INSERTs)
npm run db:clean        # delete .db-output/ entirely
```

To load the demo data on a server that has no `tsx`, copy the file over and run `sqlite3 app.db < seed.sql`. Re-applying it is a no-op. Nothing generated belongs in the repo.

### Checking directory links

Funding sources and vet hospitals are only useful if their links still resolve:

```bash
npm run db:check-links                      # report only
npm run db:check-links -- --stamp           # also write lastCheckedAt
npm run db:check-links -- --stamp --verified   # and verifiedAt, for links that passed
npm run db:check-links -- --table=funding   # just one directory
```

A 200 only proves the domain resolves. Several permanently closed pet funds still serve a healthy-looking page saying so, so the script greps page text for "permanently closed" / "dissolved" style wording and prints the sentence it matched. That is a heuristic in both directions — it can fire on a rescue's own story text, and a 403 is often just bot protection on a site that is fine. Read the snippet before changing a row, and pass `--verified` deliberately; the script never marks a link verified on its own.

## `/database-test`

A scratch page at [/database-test](http://localhost:5173/database-test) that exercises every database interaction with a form and a live result banner: hospital search by ZIP and species, funding sources by scope, donations, donation status transitions, campaign access control, promise-to-pay acceptance, moderation, and a "recompute all caches" button that rebuilds every `raisedCents` cache from the donation aggregate. Writes go through the guarded helpers in `src/lib/server/db/queries`, and guard rejections are shown with the real error, so it doubles as a manual regression suite. All examples of a database interaction live here.

## Troubleshooting

If you run into setup issues or need help with the tech stack, see the [team tech stack guide](https://docs.google.com/document/d/1NXMXuJSUIX13otgRHKkI8Be6jJJWpeLTbyRDPeqqhgc/edit?usp=sharing).

## Helpful VS Code extensions

VS Code suggests these extensions when you open the project folder. They are optional, but can make day-to-day work easier:

- **Svelte for VS Code** (`svelte.svelte-vscode`): Svelte syntax support and diagnostics.
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`): class name suggestions and previews.
- **Prisma** (`Prisma.prisma`): syntax support for the database schema.
- **Prettier - Code formatter** (`esbenp.prettier-vscode`): format project files consistently.
- **ESLint** (`dbaeumer.vscode-eslint`): show lint issues while editing.

Running the local setup above also gives VS Code access to project dependencies, SvelteKit types, and Prisma Client completions.

## Useful commands

| Command                  | Action                                                  |
| ------------------------ | ------------------------------------------------------- |
| `npm run check`          | Check Svelte and TypeScript                             |
| `npm run lint`           | Check formatting and lint                               |
| `npm run format`         | Format with Prettier                                    |
| `npm run build`          | Build the app                                           |
| `npm run db:migrate`     | Create and apply a migration from schema changes        |
| `npm run db:deploy`      | Apply committed migrations (what CI and production use) |
| `npm run db:seed`        | Load the demo data (idempotent)                         |
| `npm run db:studio`      | Browse the local database                               |
| `npm run db:reset`       | Drop, re-migrate, and re-seed the local database        |
| `npm run db:export-sql`  | Write `.db-output/seed.sql` from the current database   |
| `npm run db:clean`       | Delete the gitignored `.db-output/` directory           |
| `npm run db:check-links` | Re-check funding and hospital links                     |

Pull requests apply database migrations, then run the check, lint, and build commands automatically.
