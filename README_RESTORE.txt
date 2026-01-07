# Restoration Instructions

This is a complete backup of the Sensesys Survey App.

## Quick Start (Windows)
1. Ensure you have Node.js installed on your computer.
2. Double-click the `setup.bat` file in this folder.
3. The script will automatically install dependencies and start the app.

## Manual Installation
If you prefer to run commands manually:
1. Open a terminal in this folder.
2. Run `npm install` to download dependencies.
3. Run `npm run dev` to start the local server.

## Database (Supabase)
This project uses Supabase.
- The `.env` file containing your API keys is INCLUDED in this backup.
- If you are setting up a NEW Supabase project, use the contents of `database.sql` in the Supabase SQL Editor to create the necessary tables.

## Troubleshooting
- If `setup.bat` closes immediately, try running it from a command prompt to see any error messages.
- Ensure your internet connection is active during the first run to download packages.
