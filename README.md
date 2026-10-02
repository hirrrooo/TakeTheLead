# TakeTheLead

A nonprofit web app that helps pet owners cover urgent vet bills with 30-day fundraising campaigns. Built with SvelteKit 2, Tailwind CSS, and Prisma ORM. The app uses a SQLite database.

## Develop locally

Install [Node.js](https://nodejs.org/en/download) (v24 or later), which includes npm, then run:

```bash
npm ci
npm run db:deploy
npm run db:generate
npm run dev
```

Open [the brand guidelines](http://localhost:5173/branding). The root page is intentionally blank. Changes in `src/` or `static/` reload automatically. If port 5173 is in use, run `npm run dev -- --port 5174` and open that port instead.

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

| Command             | Action                      |
| ------------------- | --------------------------- |
| `npm run check`     | Check Svelte and TypeScript |
| `npm run lint`      | Check formatting and lint   |
| `npm run build`     | Build the app               |
| `npm run db:seed`   | Run the seed script         |
| `npm run db:studio` | Browse the local database   |

Pull requests apply database migrations, then run the check, lint, and build commands automatically.
