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
* [x] **The Scraper (History Importer)**
    * [x] Bulk history seeding (Every video in history = 1 frequency count).
* [x] **The Tracker (RSS Poller)**
* [x] **The Side-Eye (Sidebar Scraper)** 🆕
    * [ ] Scrape creators suggested in the YouTube sidebar while watching.
    * [ ] Boost "Loyalty" if a high-score creator appears in suggestions.
    * [ ] Add new creators to `suggestions` with reason "Suggested alongside [Current Creator]".

---

## 🧠 Track 3: The Algorithm (The Brain) 🔄

*Implementing the scoring logic and weighting systems.*

* [x] **Core Metrics Calculation**
* [x] **The Decay Engine (5-Month Rule)**
* [x] **The "Creator Score" Function**
* [ ] **Quality Filter** 🆕
    * [ ] Filter "Top Loyalties" to only show creators with `frequency >= 2` to remove one-off noise.

---

## 🕵️ Track 4: The Discovery Engine (The Scout) 🔄

*Finding new content based on the "High Score" creators.*

* [x] **Fingerprinting**
* [x] **Social Graph Scraper**
    * [x] Scrape "Channels" tab of top creators.
* [ ] **Related Video Discovery**
    * [ ] Use the **Side-Eye** data to build a map of related creators.

---

## 🎨 Track 5: User Interface (The Face) 🔄

*How the user interacts with the extension.*

* [x] **Popup Dashboard**
* [ ] **The "Fresh Feed"**
* [x] **Control Panel**

---

## 🧪 Track 6: Testing & Polish

* [ ] **Edge Case: The Binge Watcher**
* [ ] **Edge Case: Shorts**
* [ ] **Privacy Check**
