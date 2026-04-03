# 🌊 FlowRead Changelog

This changelog is written for humans first: clean summaries, grouped themes, and links to the exact commits.

---

## v0.0.1 — February 1, 2026

### 🚀 Major platform foundations

- Shipped the first complete FlowRead application structure with core UI, data models, services, and utility layers. ([daf3ce3](https://github.com/Vanshdeepsingh-2232/flowread/commit/daf3ce32c2729f7d3e7a5efc2a9200d9ddb7f214))
- Added foundational architecture for processing documents, semantic chunk generation, Firebase integration, and local reading persistence. ([b995b30](https://github.com/Vanshdeepsingh-2232/flowread/commit/b995b30b9008e766cbbb94589c0ad4741e53b9c3))

### 📚 Reader experience and navigation

- Introduced `ReaderView` and `Sidebar` navigation with improved reading flow and concurrent content loading behavior. ([ab6e382](https://github.com/Vanshdeepsingh-2232/flowread/commit/ab6e3828823bca491ef35683448fd01a81bec61f))
- Expanded reader functionality with progress tracking, dynamic chunk loading, and richer controls. ([f1e527f](https://github.com/Vanshdeepsingh-2232/flowread/commit/f1e527fd9579c148a9480349faac3c40a2f3839c))
- Added and iterated on `ReaderView` with reading state improvements and better in-app flow. ([6e032a2](https://github.com/Vanshdeepsingh-2232/flowread/commit/6e032a2c1cc2b3183e22e2e13f5fd90c155d32bc), [0c41a03](https://github.com/Vanshdeepsingh-2232/flowread/commit/0c41a037c3fdfa4f6a0ac6ef7989e3c0816fd4ea), [c88625a](https://github.com/Vanshdeepsingh-2232/flowread/commit/c88625a121edf2dca92f5a57397ab2dc6c39e67e), [e73a712](https://github.com/Vanshdeepsingh-2232/flowread/commit/e73a712195c8a605c402fbdbd6f535389df66fdb))

### 🧠 Processing and content intelligence

- Added genre detection and genre-aware chunk shaping to improve card quality and pacing. ([40fc0d7](https://github.com/Vanshdeepsingh-2232/flowread/commit/40fc0d763c0fabb5696a9a1323e8de08fb660aa2))
- Launched web article ingestion and semantic chunking for URL-based reading workflows. ([69b91c8](https://github.com/Vanshdeepsingh-2232/flowread/commit/69b91c87f3fcd7dd3849c26157f4c375c539674d))
- Improved PDF cleanup heuristics and instruction quality for better extraction consistency. ([f9890b6](https://github.com/Vanshdeepsingh-2232/flowread/commit/f9890b6d20592df212fa0f11a3ddcbde40016a70))

### 🧩 Product polish and supporting features

- Added About + Features pages and refined product metadata and documentation messaging. ([fa292a5](https://github.com/Vanshdeepsingh-2232/flowread/commit/fa292a52d96a45aa9e95d067fe396fca984b5395))
- Added authentication modal workflows for account sign-in and registration. ([f4da0a7](https://github.com/Vanshdeepsingh-2232/flowread/commit/f4da0a71adfc26b52e2a1503b2c930dfef1e73a2))
- Introduced a client-side logger with remote log delivery support for operational diagnostics. ([1e00aca](https://github.com/Vanshdeepsingh-2232/flowread/commit/1e00acaeaeef37a542ad67d2d67d8ab780518798))
- Enhanced extraction/progress tracking and extended the `Book` model (`furthestReadIndex`). ([b673fc5](https://github.com/Vanshdeepsingh-2232/flowread/commit/b673fc5f390a21dcf08d2bd0e32933f0affa81fb))

### 🐛 Fixes

- Corrected z-index layering and CSS class syntax issues in `OfflineView`, `Profile`, and `ReaderView`. ([b4f4fd4](https://github.com/Vanshdeepsingh-2232/flowread/commit/b4f4fd4b49e7a919c350e5297ac45a8c4d88887a))
