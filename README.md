# Spartan Budget Command

A standalone, no-build monthly budget dashboard for GitHub Pages with an unofficial gaming/HUD theme inspired by green console armor, shield meters, and tactical sci-fi interfaces. It uses only `index.html`, `styles.css`, `app.js`, and `manifest.json`.

This project does not include official Xbox, Halo, Microsoft, or Master Chief logos, screenshots, character art, or game assets. It is a self-contained budget app with an inspired visual style.

## What It Does

- Tracks monthly average credits, weekly average credits, and optional extra income.
- Calculates total available monthly credits in the browser.
- Includes default budget modules for bills, debt targets, shield reserve savings, and spending.
- Shows planned credits, spent credits, remaining credits, HUD status, and progress for every module.
- Logs daily transactions and automatically adds them to the selected module's spent credits.
- Saves automatically with `localStorage`.
- Exports a JSON backup and imports pasted JSON backups.
- Works as a static site with no backend, no build step, and no framework.

## Local Use

Open `index.html` in a browser. Your data stays in that browser's local storage. Use the backup buttons when you want a JSON file or copied backup that can be restored later.

## Daily Transaction Workflow

Use Daily Debrief at the end of the day. Choose the date, pick the budget module, enter the amount, add a short note, and log the transaction. The app automatically increases that module's spent credits and updates the summary. If you delete a transaction log, the app subtracts that amount from the module again.

## Deploy To GitHub Pages

This app should be deployed as its own separate GitHub Pages repository. Do not copy these files into an existing live budget app or another production repository.

1. Create a new GitHub repository, such as `personal-budget-dashboard`.
2. Add these files to the root of that new repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - `README.md`
3. Commit and push the files to the new repository.
4. In GitHub, open the new repository's Settings.
5. Go to Pages.
6. Under Build and deployment, choose Deploy from a branch.
7. Select the `main` branch and the root folder.
8. Save the Pages settings.

GitHub will publish the app at the Pages URL shown in that repository's Pages settings.

## Data And Privacy

Budget data is stored locally in the browser using `localStorage`. There is no backend, account system, analytics script, or network storage. Clearing browser data can remove the saved budget, so use Download Backup or Copy Backup before switching devices or clearing site data.

## Resetting

Every module can be deleted, including the original default modules. Use Reset Defaults inside the app to restore the original income fields and default module list.
