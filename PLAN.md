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
* [x] **Database Layer (web based storage)**
* [x] **State Management**

---

## 👁️ Track 2: Data Ingestion (The Eyes) ✅

*Mechanisms to gather user history and creator activity.*

* [x] **The Watcher (Content Script)**
    * [x] Completion tracking (80% / 10 min rule).
    * [x] **Interest Profiling:** Meta-keyword and title extraction. ✅
* [x] **The Scraper (History Importer)**
    * [x] Bulk history seeding (Frequency + Creator Discovery).
* [x] **The Tracker (RSS Poller)**
    * [x] Background Alarm (runs once/day).
    * [x] **Video Alerts:** Capture latest video title/ID for high-loyalty creators. ✅
* [x] **The Side-Eye (Sidebar Scraper)**
    * [x] Scrape suggested creators while watching.
    * [x] Visual indicators (Green/Blue dots) on YouTube UI. ✅

---

## 🧠 Track 3: The Algorithm (The Brain) ✅

*Implementing the scoring logic and weighting systems.*

* [x] **Core Metrics Calculation**
* [x] **The Decay Engine (5-Month Rule)**
* [x] **The "Creator Score" Function**
* [x] **Quality Filter:** Only show creators with `frequency >= 2`.
* [x] **Interest Fingerprinting:** Match new suggestions against top keywords. ✅

---

## 🕵️ Track 4: The Discovery Engine (The Scout) ✅

*Finding new content based on the "High Score" creators.*

* [x] **Fingerprinting**
* [x] **Social Graph Scraper**
    * [x] Scrape "Channels" tab of top creators.
* [x] **Smart Fresh Feed:** Rank discovery results by interest match. ✅

---

## 🎨 Track 5: User Interface (The Face) ✅

*How the user interacts with the extension.*

* [x] **Popup Dashboard**
    * [x] **Topic Cloud:** Visual keyword representation. ✅
    * [x] **Recent Success:** Track recently finished titles. ✅
    * [x] **Latest Alerts:** New videos from favorite creators. ✅
* [x] **The "Fresh Feed":** Clickable discovery links.
* [x] **Control Panel:** Refresh, Discover, and Nuke buttons.

---

## 🧪 Track 6: Testing & Polish 🔄

* [x] **Edge Case: The Binge Watcher** ✅
* [ ] **Edge Case: Shorts** (Currently tracked, decide on filtering).
* [x] **Unit Testing:** Vitest suite for core algorithm. ✅
* [x] **Privacy Audit:** Verified local-only storage and safe RSS polling. ✅
* [ ] **Data Export:** Allow users to download their local database.

---

## 🚀 Track 7: The Intelligence Upgrade (Phase 2)

*Moving from keywords to concepts using local AI.*

* [ ] **Semantic "Vibe" Engine**
    * [ ] **Tech:** Integrate `Transformers.js` (e.g., `Xenova/all-MiniLM-L6-v2`).
    * [ ] **Vector Store:** Upgrade IndexedDB to store `embedding` arrays for top creators.
    * [ ] **Logic:** Calculate "Cosine Similarity" between your history and potential new suggestions.
* [ ] **"The Reason" (Generative UI)**
    * [ ] **Tech:** Chrome Built-in AI (`window.ai` / Gemini Nano) OR simple template logic.
    * [ ] **Task:** Summarize *why* a creator is being suggested. (e.g., "Similar pacing to [Creator A] but focuses on [Topic B]").
* [ ] **The "Bridge" Finder**
    * [ ] Identify top 2 distinct topic clusters in user history.
    * [ ] Search for creators that tag *both* clusters.


---


## 📊 Track 8: Advanced Visualization

*Helping the user understand their own data.*

* [ ] **The Galaxy Graph**
    * [ ] **Tech:** D3.js or React-Force-Graph.
    * [ ] **Visual:** Nodes = Creators. Edges = Shared topics/viewers.
    * [ ] **Goal:** Show the user their "Clusters" and the empty space between them.
* [ ] **"Rabbit Hole" Mode**
    * [ ] A button to "Deep Dive" into a specific topic.
    * [ ] Temporarily boosts a specific keyword weight by 10x for the next 5 suggestions.