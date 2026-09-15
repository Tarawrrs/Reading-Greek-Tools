# Reading Greek Tools

## Project

- Application source: `Reading-Greek-1-2.html`.
- `index.html` redirects the Pages root to the application; keep query strings and fragments intact.
- Remote: `https://github.com/Tarawrrs/Reading-Greek-Tools.git`.
- Publishing branch: `main`. GitHub Pages uses the repository root.

## User workflow

The user requested that future website updates be accessible remotely through this repository.
After completing user-requested website changes, verify the affected behavior, commit only the intended website files, and push to `origin/main`, unless the user asks for local-only changes or no publication.
Check the remote and branch first, preserve unrelated changes, and never force-push.
If authentication or Pages setup is incomplete, report the concrete blocker; do not claim the site is live.

## Content and layout

- Keep the application offline-capable with its embedded font and vocabulary data.
- Grammar tables use English labels and Greek forms; avoid redundant Chinese and layout-explanation prose.
- Keep grammar accents purple and vocabulary styling scoped separately.
- Keep grammar columns evenly spaced, text readable, and horizontal scrolling inside each table.
- Contracted/uncontracted mode shows one form per cell.

## Publication scope

- Do not commit or upload local textbook PDFs, working documents, credentials, or generated QA output.
- Stage files explicitly, not the entire working directory.
