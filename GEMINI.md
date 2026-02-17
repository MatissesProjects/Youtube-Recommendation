# GEMINI.md: Development Notes & Environment Knowledge

This file tracks environment-specific configuration, lessons learned, and project-wide architectural decisions.

## 🛠 Environment & Tooling

### Shell & Commands (Windows PowerShell)
- **Command Chaining:** When running multiple commands in a single `run_shell_command` call, use the semicolon `;` as a separator instead of `&&`. 
    - *Correct:* `git status; git log`
    - *Incorrect:* `git status && git log` (Causes a ParserError in PowerShell).
- **File Operations:** Prefer PowerShell syntax for operations like copying files during builds:
    - `powershell -Command "Copy-Item -Path 'public/*' -Destination 'dist' -Recurse -Force"`

### Build System
- **Bundler:** We use `esbuild` to bundle TypeScript for the Chrome Extension.
- **Entry Points:**
    - `background.ts` -> `background.js` (Service Worker)
    - `content.ts` -> `content.js` (Watch logic)
    - `popup.ts` -> `popup.js` (UI logic)
    - `historyScraper.ts` -> `historyScraper.js` (One-time import)
    - `discoveryScraper.ts` -> `discoveryScraper.js` (Social graph)

## 🏗 Architecture Links

- **[Project Plan](PLAN.md):** The roadmap and current status of features.
- **[Data Schema](src/storage.ts):** Defines `Creator`, `HistoryEntry`, and `Suggestion` interfaces.
- **[Scoring Logic](src/algorithm.ts):** The "Brain" of the extension (Loyalty vs. Decay).
- **[Manifest](public/manifest.json):** Extension permissions and script entry points.

## 💡 Lessons Learned



1.  **YouTube SPA Navigation:** YouTube uses client-side routing. Content scripts only run on initial load, so we use a `MutationObserver` on `location.href` to re-initialize our watchers when the user navigates between videos.

2.  **RSS Quota-Free Updates:** Using `https://www.youtube.com/feeds/videos.xml?channel_id=[ID]` allows us to check for new uploads without hitting the YouTube Data API quota.

3.  **Local-First Storage:** `chrome.storage.local` is preferred over `IndexedDB` for initial development due to its simpler API and sufficient capacity (enhanced by `unlimitedStorage` permission).

4.  **Robust Link Detection:** YouTube frequently changes its DOM IDs and classes (e.g., the shift to `yt-lockup-view-model`). To remain resilient, we use pattern-based link detection (`a[href*="watch?v="]`) rather than strictly relying on class names.

5.  **Binge-Watcher Mitigation:** "Loyalty" can be artificially skewed by watching many videos in a single session. We implemented a **Session Cap** in the algorithm that limits daily frequency contribution to 3 points per creator.

6.  **Deep Keyword Extraction:** Beyond meta-tags, performing a frequency analysis on the video description provides a much richer Interest Profile, provided we filter out common "Social Noise" (e.g., subscribe, twitter, instagram).


