# TakeTheLead

A nonprofit web app that helps pet owners cover urgent vet bills with 30-day fundraising campaigns. Built with SvelteKit 2, Tailwind CSS, and Prisma ORM. Development uses a local SQLite file; production will use Cloudflare D1.

## Recommended: Develop with Docker

This is the recommended setup for the team. Docker Engine or Docker Desktop with Compose is enough to run the app; Node.js and pnpm are included in the app container:

```bash
docker compose up --build
```

Open [the brand guidelines](http://localhost:5173/branding). The root page is intentionally blank. Edit files in `src/` or `static/` while Compose is running; Vite reloads the browser. The app is available on your machine at port 5173.

At startup, the app syncs the development schema with `prisma db push`, generates Prisma Client, then starts Vite. Each checkout has its own SQLite database at `prisma/dev.db`; the file is ignored by Git and persists when the container stops. You can inspect logs with `docker compose logs -f app` and stop the app with `docker compose down`.

If port 5173 is in use, set `APP_PORT` in `.env` (copy `.env.example` first) or run `APP_PORT=5174 docker compose up --build`, then open that port in your browser.

For a Prisma schema change, run `docker compose restart app` to apply the schema and regenerate the client. To rebuild and recreate the app container after a dependency or Dockerfile change, run:

```bash
docker compose up -d --build --force-recreate
```

The app runs in the background; use `docker compose logs -f app` to watch it. The startup script synchronizes the container's dependency volume with the lockfile. Changes to files in `src/` or `static/` still reload without rebuilding.

## Alternative: Run the app on your host

This runs the app and SQLite database on your machine without Docker. Install [Node.js 24](https://nodejs.org/en/download), then run:

```bash
npm install -g pnpm@11.6.0
pnpm install
pnpm db:push
pnpm db:generate
pnpm dev
```

The local database is stored at `prisma/dev.db` and is not shared with other teammates.

## Production database

Production is planned for Cloudflare D1, which is based on SQLite. The D1 binding, Prisma D1 adapter, and migration workflow still need to be configured and tested before deployment. Teammates only need the local SQLite file; they do not need Cloudflare credentials. Cloudflare R2 for photos and KV for caching are also planned production services.

## Troubleshooting

If you run into setup issues or need help with the tech stack, see the [team tech stack guide](https://docs.google.com/document/d/1NXMXuJSUIX13otgRHKkI8Be6jJJWpeLTbyRDPeqqhgc/edit?usp=sharing).

## Helpful VS Code extensions

VS Code suggests these extensions when you open the project folder. They are optional, but can make day-to-day work easier:

- **Svelte for VS Code** (`svelte.svelte-vscode`): Svelte syntax support and diagnostics.
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`): class name suggestions and previews.
- **Prisma** (`Prisma.prisma`): syntax support for the database schema.
- **Prettier - Code formatter** (`esbenp.prettier-vscode`): format project files consistently.
- **ESLint** (`dbaeumer.vscode-eslint`): show lint issues while editing.

If you use Docker but open the project in VS Code on your host, install [Node.js 24](https://nodejs.org/en/download) and local dependencies for full import resolution, SvelteKit types, and Prisma Client completions:

```bash
npm install -g pnpm@11.6.0
pnpm install
pnpm db:generate
```

You can still run and test the app in Docker. Without local dependencies, the extensions provide basic syntax support, but some completions and diagnostics may be missing.

## Useful commands

Run the `pnpm` commands directly when developing without the app container. If the app runs in Docker, run them inside it instead (for example, `docker compose exec app pnpm check`).

| Command                  | Action                                         |
| ------------------------ | ---------------------------------------------- |
| `pnpm check`             | Check Svelte and TypeScript                    |
| `pnpm lint`              | Check formatting and lint                      |
| `pnpm db:seed`           | Run the seed script                            |
| `docker compose down`    | Stop the app, keeping the local SQLite file    |
| `docker compose down -v` | Stop the app and delete its dependency volumes |
