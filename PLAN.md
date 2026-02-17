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

* [ ] **Edge Case: The Binge Watcher**
* [ ] **Edge Case: Shorts** (Currently tracked, decide on filtering).
* [ ] **Data Export:** Allow users to download their local database.
* [ ] **Privacy Check:** Final audit of storage usage.
