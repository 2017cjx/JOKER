# JOKER — Secure Project Dumps for AI

JOKER is a web application that converts complete project repositories into **structured, text-based dumps** optimized for use with AI models.  
It provides a reliable way to supply large-language models with **comprehensive project context** while protecting sensitive information and excluding unnecessary files.

## Demo

You can try the live demo here:  
👉 [https://joker.uemura1999.com/](https://joker.uemura1999.com/)

## Key Features

- **Local-first processing**: All files are zipped in the browser before upload, ensuring privacy.
- **Structured output**: Source code, configuration, scripts, and tests are exported into categorized text files.
- **Secret protection**: `.env` keys and credentials are automatically masked.
- **Noise reduction**: Excludes heavy directories such as `node_modules/`, `.next/`, and build artifacts.
- **Transparency**: Skipped directories are still listed in `project_map.md` to preserve context.
- **Contact integration**: Built-in HubSpot form with reCAPTCHA support.

## Technology Stack

- **Frontend / Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS + custom glassmorphism components
- **Utilities**: JSZip, custom file categorization and masking libraries
- **Deployment**: Vercel with custom domain and subdomain architecture

## Example Output

- `project_map.md` — Project tree with skipped-directory log
- `src_dump.txt` — Source files with sensitive values redacted
- `tests_dump.txt` — Unit and integration tests
- `config_dump.txt` — Configuration files (e.g., `package.json`, `tsconfig.json`)
- `scripts_dump.txt` — Scripts and migration files

## Getting Started

```bash
npm install
npm run dev

```
