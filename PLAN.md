# PLAN.md: The Curator - YouTube Recommendation Extension

**Objective:** Build a local-first Chrome Extension that replaces the YouTube algorithm with a transparent, user-controlled suggestion engine based on "Loyalty" (completion ratio) rather than just engagement (clicks).

**Core Philosophy:**

1. **Local-First:** User data stays in the browser (`IndexedDB`).
2. **Loyalty > Frequency:** A creator who posts once a year but is watched 100% of the time ranks higher than a daily vlogger watched 10% of the time.
3. **Smart Decay:** Penalize creators ignored for 5+ months, unless the creator is on hiatus.

---

## 🏗️ Track 1: Architecture & Foundation

*Setup the project skeleton and storage layer.*

* [ ] **Initialize Project**
* [ ] vanilla TS, HTML, CSS.
* [ ] Create `manifest.json` (Manifest V3).
* [ ] Define permissions: `storage`, `activeTab`, `scripting`, `alarms` (for background jobs).


* [ ] **Database Layer (web based storage)**
* [ ] Explore using chrome memory for this
* [ ] **Schema Definition:**
* [ ] `creators`: `id` (channelId), `name`, `lastUploadDate`, `loyaltyScore`.
* [ ] `history`: `videoId`, `channelId`, `watchTime`, `totalDuration`, `timestamp`.
* [ ] `suggestions`: `channelId`, `reason` (e.g., "Similar to X"), `status` (new/ignored).




* [ ] **State Management**
* [ ] Set up a context or store to handle passing data between Background Service Worker and Popup UI.



---

## 👁️ Track 2: Data Ingestion (The Eyes)

*Mechanisms to gather user history and creator activity.*

* [ ] **The Watcher (Content Script)**
* [ ] Inject script into YouTube video player pages.
* [ ] Listen for HTML5 video events: `ended`, `pause`, `timeupdate`.
* [ ] Logic: Only log "watch" if `(currentTime / duration) > 0.8` (80% completion) OR `time > 10 mins`.


* [ ] **The Scraper (History Importer)**
* [ ] Build a script to parse `youtube.com/feed/history`.
* [ ] Extract: `Channel Name`, `Video Title`, and approximate watch date.
* [ ] **Action:** Run this once on install to seed the database.


* [ ] **The Tracker (RSS Poller)**
* [ ] **Endpoint:** `https://www.youtube.com/feeds/videos.xml?channel_id=[ID]`
* [ ] Create a Background Alarm (runs once/day).
* [ ] Logic: Fetch RSS for top 50 tracked creators.
* [ ] Update `lastKnownUploadDate` in DB.



---

## 🧠 Track 3: The Algorithm (The Brain)

*Implementing the scoring logic and weighting systems.*

* [ ] **Core Metrics Calculation**
* [ ] **`Frequency`**: How many total videos watched from this creator?
* [ ] **`Recency`**: Days since last watch.
* [ ] **`Loyalty Ratio`**: `(VideosWatched / VideosReleased)` *over the last 6 months*.


* [ ] **The Decay Engine (5-Month Rule)**
* [ ] Implement `checkDecay(creatorId)`:
* [ ] `IF (CurrentDate - LastWatchDate) > 5 Months`:
* [ ] Check `creator.lastKnownUploadDate`.
* [ ] `IF (LastUploadDate < LastWatchDate)`: **exemption** (Creator is on hiatus).
* [ ] `ELSE`: Apply `0.2x` weight penalty (User lost interest).






* [ ] **The "Creator Score" Function**
* [ ] Combine metrics into a single sortable integer (0-100).
* [ ] Boost score if `Loyalty Ratio > 0.8`.



---

## 🕵️ Track 4: The Discovery Engine (The Scout)

*Finding new content based on the "High Score" creators.*

* [ ] **Fingerprinting**
* [ ] Select top 5 creators by "Creator Score."
* [ ] Extract metadata: Common Keywords, Average Video Duration.


* [ ] **Lookalike Search (YouTube API)**
* [ ] **Quota Safe Mode:** Only run this manually or once/week.
* [ ] Search Query: `Keywords` + `Duration Filter`.
* [ ] Filter Results:
* [ ] Remove if already in `history`.
* [ ] Remove if `lastUploadDate` > 6 months (Dead channel).




* [ ] **Social Graph Scraper (Optional/Advanced)**
* [ ] Visit "High Score" creator profile pages.
* [ ] Scrape the "Channels" tab (Featured Channels).
* [ ] Add found channels to `suggestions` table with reason "Endorsed by [Creator Name]."



---

## 🎨 Track 5: User Interface (The Face)

*How the user interacts with the extension.*

* [ ] **Popup Dashboard**
* [ ] **Stats View:** "Top 5 Loyalties" (Creators you never miss).
* [ ] **Drift View:** "Fading Interests" (Creators being penalized by the 5-month rule).


* [ ] **The "Fresh Feed"**
* [ ] A clean list of suggested videos from the **Discovery Engine**.
* [ ] **Context Badges:**
* [ ] "Because you watch [Creator A]"
* [ ] "High Loyalty Match"
* [ ] "Endorsed by [Creator B]"




* [ ] **Control Panel**
* [ ] "Ignore Creator" button (Blacklist).
* [ ] "Force Keep" button (Override Decay penalty).



---

## 🧪 Track 6: Testing & Polish

* [ ] **Edge Case: The Binge Watcher**
* [ ] Ensure watching 20 videos in one day doesn't skew the "Daily Average" too hard.


* [ ] **Edge Case: Shorts**
* [ ] Decide: Do we track Shorts? (Recommendation: **No**, filter out videos < 60s to keep high-quality suggestions).


* [ ] **Privacy Check**
* [ ] Verify no data leaves the browser (unless using a proxy for API calls).
* [ ] Add "Export Data" / "Nuke Data" buttons.