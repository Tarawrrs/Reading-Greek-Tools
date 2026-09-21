# Reading Greek Tools

An offline-friendly vocabulary browser and Ancient Greek grammar reference.

Website (after GitHub Pages is enabled): https://tarawrrs.github.io/Reading-Greek-Tools/

## Contents

- Reading Greek Sections 1–2 vocabulary, search, and alphabet navigation.
- Personal pronouns, definite article, Type 1–2 nouns, and regular adjective paradigms.
- Active, middle, and irregular verb paradigms, including contracted/uncontracted forms.
- Section 2 genitive constructions and prepositions by governed case.
- Print layouts and embedded Greek fonts.

## Source and publishing

`Reading-Greek-1-2.html` is the source of the application. It can also be opened offline.
`index.html` forwards the website root to this file, preserving query strings and fragment links.

In repository **Settings → Pages**, use **Deploy from a branch**, **main**, **/(root)**.
GitHub Pages then republishes the site after pushes to `main`.

For updates, edit the application, check the affected behavior, commit the intended files, and push:

```sh
git add Reading-Greek-1-2.html
git commit -m "Update Greek reference tables"
git push origin main
```

Source PDFs are local references, excluded by `.gitignore`, and are not part of this website.
The embedded font license is included in the HTML. Textbook references are credited in the application.
