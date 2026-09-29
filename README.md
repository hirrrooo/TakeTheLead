# TakeTheLead

A nonprofit web app that helps pet owners cover urgent vet bills with 30-day fundraising campaigns. Built with SvelteKit 2, Tailwind CSS, and Prisma ORM. Development uses a local SQLite file; production will use Cloudflare D1.

## Develop locally

Install [Node.js 24](https://nodejs.org/en/download), which includes npm, then run:

```bash
npm ci
npm run db:push
npm run db:generate
npm run dev
```

Open [the brand guidelines](http://localhost:5173/branding). The root page is intentionally blank. Changes in `src/` or `static/` reload automatically. If port 5173 is in use, run `npm run dev -- --port 5174` and open that port instead.

Each checkout has its own SQLite database at `prisma/dev.db`. Git ignores the file, so teammates do not share local data. After changing `prisma/schema.prisma`, run `npm run db:push` and `npm run db:generate` again.

## Production database

The SvelteKit app is planned for Cloudflare, with D1 as its production database. D1 is based on SQLite. The D1 binding, Prisma D1 adapter, and migration workflow still need to be configured and tested before deployment. Teammates only need the local SQLite file; they do not need Cloudflare credentials. Cloudflare R2 for photos and KV for caching are also planned production services.

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

Pull requests run the database setup, check, lint, and build commands automatically.
