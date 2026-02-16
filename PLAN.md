# PLAN.md: The Curator - YouTube Recommendation Extension

**Objective:** Build a local-first Chrome Extension that replaces the YouTube algorithm with a transparent, user-controlled suggestion engine based on "Loyalty" (completion ratio) rather than just engagement (clicks).

**Core Philosophy:**

1. **Local-First:** User data stays in the browser (`chrome.storage.local`).
2. **Loyalty > Frequency:** A creator who posts once a year but is watched 100% of the time ranks higher than a daily vlogger watched 10% of the time.
3. **Smart Decay:** Penalize creators ignored for 5+ months, unless the creator is on hiatus.

---

## 🏗️ Track 1: Architecture & Foundation ✅

*Setup the project skeleton and storage layer.*

* [x] **Initialize Project**
    * [x] vanilla TS, HTML, CSS.
    * [x] Create `manifest.json` (Manifest V3).
    * [x] Define permissions: `storage`, `activeTab`, `scripting`, `alarms`.
* [x] **Database Layer (web based storage)**
    * [x] Using `chrome.storage.local` for simplicity and persistence.
    * [x] **Schema Definition:** (See `src/storage.ts`)
    * [x] `creators`: `id` (channelId), `name`, `lastUploadDate`, `loyaltyScore`.
    * [x] `history`: `videoId`, `channelId`, `watchTime`, `totalDuration`, `timestamp`.
    * [x] `suggestions`: `channelId`, `reason`, `status`.
* [x] **State Management**
    * [x] Centralized via `storage.ts` and shared between Service Worker and Popup.

---

## 👁️ Track 2: Data Ingestion (The Eyes) ✅

*Mechanisms to gather user history and creator activity.*

* [x] **The Watcher (Content Script)**
    * [x] Inject script into YouTube video player pages.
    * [x] Logic: Only log "watch" if `(currentTime / duration) > 0.8` OR `time > 10 mins`.
* [x] **The Scraper (History Importer)**
    * [x] Build `historyScraper.ts` to parse `youtube.com/feed/history`.
    * [x] **Action:** Manual trigger from Popup.
* [x] **The Tracker (RSS Poller)**
    * [x] Background Alarm (runs once/day).
    * [x] Logic: Fetch RSS for top 50 tracked creators to update `lastUploadDate`.

---

## 🧠 Track 3: The Algorithm (The Brain) ✅

*Implementing the scoring logic and weighting systems.*

* [x] **Core Metrics Calculation** (See `src/algorithm.ts`)
    * [x] **`Frequency`**: Total videos watched.
    * [x] **`Recency`**: Days since last watch.
    * [x] **`Loyalty Ratio`**: Average completion of recent videos.
* [x] **The Decay Engine (5-Month Rule)**
    * [x] Logic: 0.2x penalty if inactive for 5 months, with hiatus exemption.
* [x] **The "Creator Score" Function**
    * [x] Combined 0-100 sortable integer.

---

## 🕵️ Track 4: The Discovery Engine (The Scout) 🔄

*Finding new content based on the "High Score" creators.*

* [x] **Fingerprinting**
    * [x] Select top 5 creators by "Creator Score."
* [ ] **Lookalike Search (YouTube API)**
    * [ ] *Pivoted to Social Graph Scraper to avoid API Quotas.*
* [x] **Social Graph Scraper**
    * [x] Visit "High Score" creator `/channels` tabs.
    * [x] Scrape featured channels and add to `suggestions`.

---

## 🎨 Track 5: User Interface (The Face) 🔄

*How the user interacts with the extension.*

* [x] **Popup Dashboard**
    * [x] **Stats View:** List of top creators and their loyalty scores.
* [ ] **The "Fresh Feed"**
    * [ ] Display suggested videos/channels from the Discovery Engine.
* [x] **Control Panel**
    * [x] "Import History" button.
    * [x] "Refresh" scores button.
    * [x] "Discover New" button.

---

## 🧪 Track 6: Testing & Polish

* [ ] **Edge Case: The Binge Watcher**
* [ ] **Edge Case: Shorts**
* [ ] **Privacy Check**
    * [ ] Add "Export Data" / "Nuke Data" buttons.
