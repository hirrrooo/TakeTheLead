# TakeTheLead

A nonprofit web app that helps pet owners cover urgent vet bills with 30-day fundraising campaigns. Built with SvelteKit 2, Tailwind CSS, Prisma ORM, and PostgreSQL.

## Recommended: Develop with Docker

This is the recommended setup for the team. Docker Engine or Docker Desktop with Compose is enough to run the app; Node.js and pnpm are included in the app container. Start the app and database together:

```bash
docker compose up --build
```

Open [the brand guidelines](http://localhost:5173/branding). The root page is intentionally blank. Edit files in `src/` or `static/` while Compose is running; Vite reloads the browser. The app is available on your machine at port 5173, and PostgreSQL is available at port 5432.

At startup, the app waits for PostgreSQL, syncs the development schema with `prisma db push`, generates Prisma Client, then starts Vite. Database data persists in the `postgres_data` Docker volume. You can inspect logs with `docker compose logs -f app` and stop the stack with `docker compose down`.

Copy `.env.example` to `.env` if you need to change the default database credentials or ports. `APP_PORT` changes the browser-facing app port, and `POSTGRES_PORT` changes the host-facing database port. The app container always connects to the database by its Compose service name; the `DATABASE_URL` in `.env` is for commands run on your host.

For a Prisma schema change, run `docker compose restart app` to apply the schema and regenerate the client. To rebuild and recreate the containers after a dependency or Dockerfile change, run:

```bash
docker compose up -d --build --force-recreate
```

The containers run in the background; use `docker compose logs -f app` to watch the app. The startup script synchronizes the container's dependency volume with the lockfile. Changes to files in `src/` or `static/` still reload without rebuilding.

## Alternative: Run the app on your host

This runs the app and Prisma commands on your machine while PostgreSQL still runs in Docker. Install [Node.js 24](https://nodejs.org/en/download) and pnpm, then run:

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:push
pnpm db:generate
pnpm dev
```

`pnpm db:up` starts only PostgreSQL. `pnpm db:down` stops only PostgreSQL.

## Troubleshooting

If you run into setup issues or need help with the tech stack, see the [team tech stack guide](https://docs.google.com/document/d/1NXMXuJSUIX13otgRHKkI8Be6jJJWpeLTbyRDPeqqhgc/edit?usp=sharing).

## Helpful VS Code extensions

VS Code suggests these extensions when you open the project folder. They are optional, but can make day-to-day work easier:

- **Svelte for VS Code** (`svelte.svelte-vscode`): Svelte syntax support and diagnostics.
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`): class name suggestions and previews.
- **Prisma** (`Prisma.prisma`): syntax support for the database schema.
- **Prettier - Code formatter** (`esbenp.prettier-vscode`): format project files consistently.
- **ESLint** (`dbaeumer.vscode-eslint`): show lint issues while editing.

If you open the project in VS Code on your host, install [Node.js 24](https://nodejs.org/en/download). Afterwards, install the dependencies locally for full import resolution, SvelteKit types, and Prisma Client completions:

```bash
npm install -g pnpm@11.6.0
pnpm install
pnpm db:generate
```

You can still run and test the app in Docker. Without local dependencies, the extensions provide basic syntax support, but some completions and diagnostics may be missing.

## Useful commands

Run the `pnpm` commands directly when developing without the app container. If the app runs in Docker, run them inside it instead (for example, `docker compose exec app pnpm check`).

| Command                  | Action                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `pnpm check`             | Check Svelte and TypeScript                                   |
| `pnpm lint`              | Check formatting and lint                                     |
| `pnpm db:seed`           | Run the seed script                                           |
| `docker compose down`    | Stop the app and database, keeping data                       |
| `docker compose down -v` | Stop the stack and delete its database and dependency volumes |
