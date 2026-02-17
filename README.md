# The Curator: YouTube Recommendation Extension

**Take back control of your attention.**

The Curator is a local-first Chrome Extension that replaces the black-box YouTube algorithm with a transparent, user-controlled suggestion engine. It prioritizes **Loyalty** (how often you actually finish a creator's videos) over **Engagement** (what you were tricked into clicking).

## 🧠 Core Philosophy

1.  **Local-First:** Your watch history and interest profile stay in your browser. No data is sent to external servers.
2.  **Loyalty > Frequency:** A creator who posts once a month but you watch 100% of the time is ranked higher than a daily vlogger you only watch 10% of the time.
3.  **Smart Decay:** Your interests change. The Curator automatically penalizes creators you haven't watched in 5 months—unless they are on hiatus (detected via RSS).

## ✨ Key Features

-   **The Watcher:** Automatically tracks video completion. A "watch" is only logged if you complete 80% of a video or watch for more than 10 minutes.
-   **Interest Profiling:** Performs deep keyword analysis on video titles and descriptions to build a "Topic Cloud" of your true interests.
-   **The Side-Eye:** Scrapes the YouTube sidebar while you watch. New creators are added to your discovery feed, while recognized creators get a visual "loyalty boost."
-   **History Importer:** Seeds your database instantly by scanning your existing YouTube History page.
-   **Favorite Alerts:** Uses background RSS polling to notify you the moment your high-loyalty creators upload new content.
-   **Fresh Feed:** A curated discovery list ranked by how well new suggestions match your specific keyword interest profile.

## 🚀 Installation (Developer Mode)

1.  Clone this repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the project:
    ```bash
    npm run build
    ```
4.  Open Chrome and navigate to `chrome://extensions/`.
5.  Enable **Developer mode** (top right toggle).
6.  Click **Load unpacked** and select the `dist` folder in this project directory.

## 🛠 Tech Stack

-   **Language:** TypeScript
-   **Bundler:** esbuild
-   **Storage:** `chrome.storage.local` (with `unlimitedStorage` permission)
-   **UI:** Vanilla HTML/CSS (Manifest V3)
-   **Communication:** Background Service Workers & Content Script messaging

## 📈 The Algorithm

The **Loyalty Score (0-100)** is calculated using three primary vectors:
-   **Frequency:** Total number of videos watched from a creator.
-   **Loyalty Ratio:** Average completion rate of the last 10 videos.
-   **Recency & Decay:** A 0.2x penalty is applied if no videos are watched for 5 months, provided the creator has actually uploaded during that time.

## 🔒 Privacy

All data processed by The Curator remains strictly on your local machine within the extension's isolated storage. The extension uses RSS feeds to check for new videos, which does not require a YouTube API key or any user-identifiable tracking.
