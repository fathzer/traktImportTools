# Trakt TV Time import helper
This tool is designed to diagnose and remediate import issues from TV Time to Trakt.

It is a lightweight, client-side JavaScript application to explore your Trakt movie watch history, update incorrect playback timestamps, and import your TV Time episode ratings using the `TV Time Liberator` export.


## Features
- **OAuth2 Device Flow:** Authenticate securely directly from the browser without a backend server.
- **Session Persistence:** Securely stores your session access token in your browser's local storage.
- **Interactive Movie Watch History Grid:** Displays Trakt, IMDb, and TMDb identifiers along with titles and precise watch dates.
- **Date Correction:** Safely updates movie watch dates at the desired historical timestamp.
- **TV Time Episode Import:** Import your TV Time episode watch dates and ratings using the `TV Time Liberator` export and detect unknown episodes.
- **Automatic Corrections Saving:** All corrections (IMDb IDs, ignore flags) are automatically saved to local storage with debounce.
- **Complete State Export:** Export the full state (successes and failures) with all corrections for backup or re-import.
- **Retry Failed Episodes:** Retry synchronization of failed episodes after correcting their IMDb IDs.

## How to Use It

### Authentication
1. Click "Connect to Trakt" to authenticate using OAuth2 Device Flow.
2. Follow the instructions to authorize the application on Trakt.
3. Your session will be stored in your browser's local storage.

### Movie Watch History
1. Click "Load History" to fetch your movie watch history from Trakt.
2. Review the grid displaying Trakt, IMDb, and TMDb identifiers.
3. To correct a watch date, click "Update" on any movie row.
4. Enter the correct date and confirm the update.

### TV Time Episode Import
1. Export your TV Time data using the `TV Time Liberator` Chrome extension.
2. Select the `shows.json` file from the export.
3. Click "Start Import" to begin synchronization with Trakt.
4. Review the detailed report:
   - **Successes:** Episodes successfully imported
   - **Failures:** Episodes not found on Trakt (can be corrected), or with inconsistent data (rated but not watched)
5. For failed episodes:
   - Correct IMDb IDs manually in the table
   - Mark episodes to ignore with the checkbox if you prefer to enter them manually in Trakt
   - Corrections are automatically saved
6. Click "Retry" to re-synchronize corrected episodes
7. Use "Export Corrected File" to save the complete state for backup (this file can be imported later to retry failed episodes)

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
