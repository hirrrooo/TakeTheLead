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
npm run db:push         # create local.db from prisma/schema.prisma
npm run db:generate     # regenerate the Prisma client
npm run db:seed         # load demo data (idempotent — safe to re-run)
npm run db:studio       # browse the data in Prisma Studio
```

## Demo accounts

The seed creates these loginable accounts (password for all: `password123!`):

| Email                       | Name            | Role                                  |
| --------------------------- | --------------- | ------------------------------------- |
| `seed_maria@takethelead.dev` | Maria Alvarez   | Owner of 3 stories, co-manager on 1   |
| `seed_james@takethelead.dev` | James Alvarez   | Co-manager (MANAGER) on Bella's story |
| `seed_pat@takethelead.dev`   | Pat Nguyen      | Owner of 3 stories                    |
| `seed_mod@takethelead.dev`   | Dana Whitfield  | Moderator (`isModerator`) — review queue |

A non-loginable `system` user (`id = "system"`) exists to own orphaned stories.

Demo data covers: approved/pending/closed/draft stories, anonymous owners,
multi-pet stories, family co-management, guest + anonymous donations, refunded
donations, verified and unverified vet invoices, a near-duplicate clinic pair,
and a CHANGES_REQUESTED → APPROVED moderation trail.
