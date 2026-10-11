# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.17.1 create --template minimal --types ts --add tailwindcss="plugins:typography,forms" playwright sveltekit-adapter="adapter:cloudflare+cfTarget:workers" better-auth="demo:password" ai-tools="ide:claude-code,vscode,opencode+delivery:plugin+tools:mcp,svelte-code-writer,svelte-core-bestpractices,svelte-file-editor+mcpSetup:remote" drizzle="database:sqlite+sqlite:libsql" --install npm ./
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Database (Prisma + SQLite)

```sh
cp .env.example .env    # then fill in BETTER_AUTH_SECRET
npm run db:generate     # regenerate the Prisma client (output is gitignored)
npm run db:push         # create local.db from prisma/schema.prisma
npm run db:seed         # load demo data (idempotent — safe to re-run)
npm run db:studio       # browse the data in Prisma Studio
```

Everything above works the same on Linux. `db:seed` runs `tsx prisma/seed.ts`;
the two `.mjs` scripts below run on plain `node`.

### What the seed contains

`prisma/seed-data.ts` holds the data and nothing else; `prisma/seed.ts` only
validates it and writes it. Field names match `prisma/schema.prisma` exactly.

| Model                | Rows | Notes                                                            |
| -------------------- | ---- | ---------------------------------------------------------------- |
| `User`               |    5 | 4 loginable accounts + a non-loginable `system` user              |
| `Campaign`           |    6 | approved / draft / closed, multi-pet, family co-management        |
| `Donation`           |   27 | guest, anonymous, pending, refunded; `raisedCents` recomputed     |
| `VetHospital`        |   12 | Hampton Roads, VA — ZIP, phone, 24/7 flag, emergency hours        |
| `FundingSource`      |   15 | 11 starter + 4 added, every `verifiedAt` hand-checked              |
| `PromiseToPay`       |    6 | one deliberately *unaccepted* so the approve guard can be demoed  |

Plus pets, campaign links, vet records, and a CHANGES_REQUESTED → APPROVED
moderation trail. `seed.ts` refuses to run if the data breaks an invariant
(money splits, exactly one 24/7 hospital, ZIP/phone formats, unique URLs).

### Output files

Generated artefacts go in `.db-output/`, which is gitignored and disposable:

```sh
npm run db:export-sql   # -> .db-output/seed.sql (portable INSERTs)
npm run db:clean        # delete .db-output/ entirely
```

To load the demo data on a server that has no `tsx`, copy the file over and
run `sqlite3 app.db < seed.sql`. Re-applying it is a no-op.

### Checking directory links

```sh
npm run db:check-links                      # report only
npm run db:check-links -- --stamp           # also write lastCheckedAt
npm run db:check-links -- --stamp --verified   # and verifiedAt, for links that passed
npm run db:check-links -- --table=funding   # just one directory
```

A 200 only proves the domain resolves. Several permanently closed pet funds
still serve a healthy-looking page saying so, so the script greps page text for
"permanently closed" / "dissolved" style wording and prints the sentence it
matched. That is a heuristic in both directions — it can fire on a rescue's own
story text, and a 403 is often just bot protection on a site that is fine. Read
the snippet before changing a row, and pass `--verified` deliberately; the
script never marks a link verified on its own.

## `/database-test`

A scratch page at `/database-test` (dev only) that exercises every database
interaction with a form and a live result banner: hospital search by ZIP and
species, funding sources by scope, donations, donation status transitions,
campaign access control, ownership transfer, promise-to-pay acceptance,
moderation, and a "fix the arithmetic" button that rebuilds every
`raisedCents` cache from the donation aggregate. Guard rejections are shown
with the real error, so it doubles as a manual regression suite.

## Demo accounts

The seed creates these loginable accounts (password for all: `password123!`):

| Email                        | Name           | Role                                     |
| ---------------------------- | -------------- | ---------------------------------------- |
| `seed_maria@takethelead.dev` | Maria Alvarez  | Owner of 3 campaigns, co-manager on 2    |
| `seed_james@takethelead.dev` | James Alvarez  | Co-manager (MANAGER) on Bella's campaign |
| `seed_pat@takethelead.dev`   | Pat Nguyen     | Owner of 3 campaigns                     |
| `seed_mod@takethelead.dev`   | Dana Whitfield | Moderator (`isModerator`) — review queue |

A non-loginable `system` user (`id = "system"`) exists to own orphaned campaigns.

Demo data covers: approved/pending/closed/draft campaigns, anonymous owners,
multi-pet campaigns, family co-management, guest + anonymous donations, refunded
donations, verified and unverified vet invoices, a near-duplicate hospital pair,
and a CHANGES_REQUESTED → APPROVED moderation trail.
