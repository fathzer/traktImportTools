# Trakt Watched Date Editor Prototype

A lightweight, client-side JavaScript prototype to explore your Trakt movie watch history and update incorrect playback timestamps. This tool is designed to diagnose and remediate synchronization issues between Trakt and third-party media managers (like Cinematique).

## Features
- **OAuth2 Device Flow:** Authenticate securely directly from the browser without a backend server.
- **Session Persistence:** Securely stores your session access token in your browser's local storage.
- **Interactive History Grid:** Displays Trakt, IMDb, and TMDb identifiers along with titles and precise watch dates.
- **Date Correction:** Safely updates movie playback dates by removing the stale entry and creating a new record at the desired historical timestamp.

## Project Structure

├── index.html       # The main user interface
├── auth.js          # Authentication and Device Flow handling module
├── traktApi.js      # Core module managing GET/POST requests to Trakt API
├── config.js        # Personal secrets and API Keys (DO NOT COMMIT)
└── .gitignore       # Prevents sensitive files from being pushed to Git

## Setup Instructions

### 1. Register a Trakt Application
1. Go to your Trakt API Applications Dashboard (https://trakt.tv/oauth/applications).
2. Create a new application.
3. Configure the following fields to prevent CORS browser blockages:
   - Redirect URI: http://localhost (or your exact local development server address)
   - Javascript Origins: http://localhost
4. Save the changes to get your Client ID and Client Secret.

### 2. Configure Local Environment Variables
Create a file named config.js in the root directory of this project. Copy and paste the template below, replacing the placeholder values with your actual Trakt app credentials:

export const CONFIG = {
    CLIENT_ID: 'YOUR_ACTUAL_CLIENT_ID_HERE',
    BASE_URL: 'https://api.trakt.tv'
};

--> Important Security Note: The config.js file contains highly sensitive private credentials. It is pre-configured to be excluded from your version control system via .gitignore to prevent leaks onto public GitHub repositories.

### 3. Ensure .gitignore is Active
Make sure your project contains a .gitignore file specifying at least the following rule:

config.js


## How to Run

Because this project relies on vanilla ES Modules (import/export syntax), modern browsers enforce strict security policies that prevent loading them directly from local file pathways (file://).

You must serve these files using a local web server environment.

### Option A: Using VS Code (Recommended)
Install the Live Server extension, then click Go Live on the bottom status bar while viewing index.html.

### Option B: Using Python CLI
Open a terminal inside your project folder and run:
python3 -m http.server 8000

Then navigate to http://localhost:8000 in your web browser.