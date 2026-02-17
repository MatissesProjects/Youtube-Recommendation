# PLAN.md: The Curator - YouTube Recommendation Extension

**Objective:** Build a local-first Chrome Extension that replaces the YouTube algorithm with a transparent, user-controlled suggestion engine based on "Loyalty" (completion ratio) rather than just engagement (clicks).

**Core Philosophy:**
1. **Local-First:** User data stays in the browser (`chrome.storage.local`).
2. **Loyalty > Frequency:** A creator who posts once a year but is watched 100% of the time ranks higher than a daily vlogger watched 10% of the time.
3. **Smart Decay:** Penalize creators ignored for 5+ months, unless the creator is on hiatus.

---

## 🏗️ Track 1: Architecture & Foundation ✅
* [x] **Initialize Project**
* [x] **Database Layer (web based storage)**
* [x] **State Management**

---

## 👁️ Track 2: Data Ingestion (The Eyes) ✅
* [x] **The Watcher (Content Script):** Completion tracking (80% / 10 min rule).
* [x] **Interest Profiling:** Meta-keyword and title extraction. ✅
* [x] **The Scraper (History Importer):** Bulk history seeding.
* [x] **The Tracker (RSS Poller):** Background Alarm for video alerts. ✅
* [x] **The Side-Eye (Sidebar Scraper):** Scrape suggested creators & UI indicators. ✅

---

## 🧠 Track 3: The Algorithm (The Brain) ✅
* [x] **Core Metrics Calculation**
* [x] **The Decay Engine (5-Month Rule)**
* [x] **The "Creator Score" Function**
* [x] **Quality Filter:** `frequency >= 2` rule.
* [x] **Interest Fingerprinting:** Keyword matching. ✅

---

## 🕵️ Track 4: The Discovery Engine (The Scout) ✅
* [x] **Fingerprinting**
* [x] **Social Graph Scraper:** "Channels" tab scraping.
* [x] **Smart Fresh Feed:** Rank discovery results by interest match. ✅

---

## 🎨 Track 5: User Interface (The Face) ✅
* [x] **Popup Dashboard:** Topic Cloud, Recent Success, Latest Alerts. ✅
* [x] **The "Fresh Feed":** Clickable discovery links.
* [x] **Control Panel:** Refresh, Discover, and Nuke buttons.

---

## 🧪 Track 6: Testing & Polish ✅
* [x] **Edge Case: The Binge Watcher** ✅
* [x] **Edge Case: Shorts** (Skipped)
* [x] **Unit Testing:** Vitest suite for core algorithm. ✅
* [x] **Privacy Audit:** Local-only storage verification. ✅
* [x] **Data Export:** (Skipped)

---

## 🚀 Track 7: The Intelligence Upgrade (Phase 2) ✅
* [x] **Semantic "Vibe" Engine:** `Transformers.js` & Vector storage. ✅
* [x] **"The Reason" (Generative UI):** Explain why a video was suggested. ✅
* [x] **The "Bridge" Finder:** Cross-cluster interest matching. ✅

---

## 📊 Track 8: Advanced Visualization ✅
* [x] **The Galaxy Graph:** Full-page force-directed graph. ✅
* [x] **"Rabbit Hole" Mode:** Temporary 10x topic boost with timeout. ✅

---

## 📓 Track 9: The "Second Brain" (Content & Capture) ✅
*Turning passive watching into active knowledge.*
* [x] **Video Annotations:** ✅ Injected "Note" button in YouTube player controls.
* [x] **The Auto-Summarizer:** ✅ Pipeline for transcript-to-summary conversion via window.ai/Ollama.
* [x] **Knowledge Export:** ✅ Markdown/Obsidian export with YAML metadata and JSON dump.

---

## 🔍 Track 14: Deep Vector Search (In Progress) 🔄
*Finding knowledge using concepts, not just keywords.*
* [ ] **Knowledge Embedding Pipeline:** Automatically generate semantic embeddings for History Entries.
* [ ] **Concept Search:** Search history by "Vibe" rather than exact string matching.
* [ ] **Search UI:** Implement a semantic search bar in the Galaxy Dashboard.

---

## 🛡️ Track 10: The "True Signal" Pipeline (Anti-Noise) 🆕
*Cleaning the data ingestion to ensure quality over clickbait.*
* [ ] **SponsorBlock Integration:** Query API to subtract fluff from "True Watch Time."
* [ ] **The De-Hype Layer:** Use Local AI to rewrite clickbait titles (ALL CAPS/Emojis).
* [ ] **Content Farm Filter:** Downrank if "True Duration" is < 50% of total length.
* [ ] **UI Nuke:** Inject CSS to hide native YouTube sidebar and homepage feeds.

---

## 🎙️ Track 11: Creator Research Mode (The Streamer's Edge) 🆕
*Flipping the engine for competitive analysis.*
* [ ] **Niche Gap Identification:** Find overlapping keywords that lack recent high-quality videos.
* [ ] **Pacing Analytics:** Calculate avg. length and structure of growing discovery candidates.
* [ ] **Obsidian Sync:** "Save to Vault" via `obsidian://new` URI for research logs.

---

## ⚙️ Track 12: High-Performance Backend (Optional) 🆕
*Decoupling processing for heavy-lifting tasks.*
* [ ] **FastAPI Bridge:** Spin up a local Python backend for heavy scoring/scraping.
* [ ] **RL Weighting:** Replace the 5-month rule with Reinforcement Learning based on actual CTR.
* [ ] **Mixture of Experts (MoE):** Specialized models for Coding vs. Gaming vs. Finance suggestions.

---

## 🤝 Track 13: Sovereignty & Context 🆕
*Community sharing and mood-based filtering.*
* [ ] **"Curator Packs":** Export/Import "High Loyalty" creator lists via JSON.
* [ ] **The Context Dial:** Energy-level filters (Low Energy/Chill vs. High Energy/Learn).
* [ ] **Time Budgeting:** Filter "Fresh Feed" based on available time + SponsorBlock data.

