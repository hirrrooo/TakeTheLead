# TakeTheLead

A nonprofit web app that helps pet owners cover urgent vet bills with 30-day fundraising campaigns. Built with SvelteKit 2, Tailwind CSS, Prisma ORM, and PostgreSQL.

## Develop with Docker

Docker Engine or Docker Desktop with Compose is the only host prerequisite. Start the app and database together:

```bash
docker compose up --build
```

If port 5173 is in use, start it on another host port, for example `APP_PORT=5174 docker compose up --build`, and open that port in your browser.

Open [the brand guidelines](http://localhost:5173/branding). The root page is intentionally blank. Edit files in `src/` or `static/` while Compose is running; Vite reloads the browser. The app is available on your machine at port 5173, and PostgreSQL is available at port 5432.

At startup, the app waits for PostgreSQL, syncs the development schema with `prisma db push`, generates Prisma Client, then starts Vite. Database data persists in the `postgres_data` Docker volume. You can inspect logs with `docker compose logs -f app` and stop the stack with `docker compose down`.

Copy `.env.example` to `.env` if you need to change the default database credentials or ports. `APP_PORT` changes the browser-facing app port, and `POSTGRES_PORT` changes the host-facing database port. The app container always connects to the database by its Compose service name; the `DATABASE_URL` in `.env` is for commands run on your host.

For a Prisma schema change, run `docker compose restart app` to apply the schema and regenerate the client. To rebuild and recreate the containers after a dependency or Dockerfile change, run:

```bash
docker compose up -d --build --force-recreate
```

The containers run in the background; use `docker compose logs -f app` to watch the app. The startup script synchronizes the container's dependency volume with the lockfile. Changes to files in `src/` or `static/` still reload without rebuilding.

## Develop without the app container

Install Node.js and pnpm, then run:

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:push
pnpm db:generate
pnpm dev
```

`pnpm db:up` starts only PostgreSQL. `pnpm db:down` stops only PostgreSQL.

## Useful commands

Run the `pnpm` commands directly when developing without the app container. If the app runs in Docker, run them inside it instead (for example, `docker compose exec app pnpm check`).

| Command                 | Action                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `pnpm check`            | Check Svelte and TypeScript                                   |
| `pnpm lint`             | Check formatting and lint                                     |
| `pnpm db:seed`          | Run the seed script                                           |
| `docker compose down`   | Stop the app and database, keeping data                       |
| `docker compose down -v` | Stop the stack and delete its database and dependency volumes |
