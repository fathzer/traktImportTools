# Trakt Watched Date Editor Prototype

This tool is designed to diagnose and remediate import issues from TV Time to Trakt.

It is a lightweight, client-side JavaScript application to explore your Trakt movie watch history, update incorrect playback timestamps, and import your TV Time episode ratings using the `TV Time Liberator` export.


## Features
- **OAuth2 Device Flow:** Authenticate securely directly from the browser without a backend server.
- **Session Persistence:** Securely stores your session access token in your browser's local storage.
- **Interactive Movie Watch History Grid:** Displays Trakt, IMDb, and TMDb identifiers along with titles and precise watch dates.
- **Date Correction:** Safely updates movie watch dates at the desired historical timestamp.
- **TV Time Episode Ratings Import:** Import your TV Time episode ratings using the `TV Time Liberator` export and detect unknown episodes.

## How to Use It
TODO

## Project Structure

```
traktTest/
├── index.html              # The main user interface
├── auth.js                 # Authentication and Device Flow handling module
├── oauth.js                # OAuth2 device flow implementation
├── traktApi.js             # Core module managing GET/POST requests to Trakt API
├── tvTimeLiberator.js      # TV Time data liberation utilities
├── config.js               # Personal secrets and API Keys (DO NOT COMMIT)
├── .gitignore              # Prevents sensitive files from being pushed to Git
├── LICENSE                 # Project license
└── ui/                     # User interface modules
    ├── authUi.js           # Authentication UI components
    ├── i18n.js             # Internationalization support
    ├── mainUi.js           # Main UI controller
    ├── moviesUi.js         # Movies grid UI
    └── ratingsUi.js        # Ratings display UI
```

## Setup Instructions for Developers

### 1. Register a Trakt Application
1. Go to your Trakt API Applications Dashboard (https://trakt.tv/oauth/applications).
2. Create a new application.
3. Configure the following fields to prevent CORS browser blockages:
   - Redirect URI: http://localhost (or your exact local development server address)
   - JavaScript Origins: http://localhost
4. Save the changes to get your Client ID and Client Secret.

### 2. Configure Application Credentials
Update the config.js file in the root directory of this project with your actual Trakt application credentials:

export const CONFIG = {
    CLIENT_ID: 'YOUR_ACTUAL_CLIENT_ID_HERE',
    BASE_URL: 'https://api.trakt.tv'
};

## How to Run the Application

This project uses vanilla ES Modules (import/export syntax). Modern browsers enforce strict security policies that prevent loading these modules directly from local file paths (file://). You must serve these files using a local web server.

### Option A: Using VS Code (Recommended)
Install the Live Server extension, then click Go Live on the bottom status bar while viewing index.html.

### Option B: Using Python CLI
Open a terminal inside your project folder and run:
python3 -m http.server 8000

Then navigate to http://localhost:8000 in your web browser.