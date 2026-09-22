# Take the Lead

A nonprofit web app that helps pet owners cover urgent vet bills with 30-day fundraising campaigns.
CS 410, Spring 2026, Team Green.

**Status:** Planning. The SvelteKit project hasn't been set up yet.

## Tech Stack

SvelteKit 2 (Svelte 5), Tailwind CSS, Prisma ORM, PostgreSQL

## Setup

### 1. Install

- **Node.js** (LTS version): https://nodejs.org
- **Git**: https://git-scm.com/downloads/win
- **PostgreSQL**: https://www.postgresql.org/download/windows/
  - Keep all components checked and leave the port as `5432`.
  - Write down the password you set for the `postgres` user.
  - Uncheck "Launch Stack Builder" at the end.

SvelteKit, Tailwind and Prisma don't need separate installs. They download with `npm install`.

### 2. VS Code extensions

- Svelte for VS Code
- Tailwind CSS IntelliSense
- Prisma

### 3. Windows fixes (if needed)

- **`npm` says "running scripts is disabled":** run this once in PowerShell:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **`psql` is not recognized:** add `C:\Program Files\PostgreSQL\18\bin` to your PATH (change `18` to your version).

Restart VS Code, then check that each of these prints a version:

```
node --version
git --version
psql --version
```

## Possible Project Structure

SvelteKit keeps the frontend and backend in one project:

```
TakeTheLead/
├── prisma/              Database: schema (tables) and migrations
├── src/
│   ├── routes/          Pages (each folder is a URL, e.g. dashboard/ → /dashboard)
│   ├── lib/
│   │   ├── components/  Frontend: buttons, campaign cards, forms
│   │   └── server/      Backend: database calls, login, ranking logic (never sent to the browser)
│   └── app.css          Tailwind styles and brand colors
├── static/              Logo and images
└── package.json
```
