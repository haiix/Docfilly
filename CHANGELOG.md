# Changelog

## Unreleased

### Added

* add English and Japanese locales for Core diagnostics and the React wrapper

### Changed

* diagnostics now default to English; pass `locale: "ja"` to preserve Japanese messages

## 0.1.0 (2026-08-20)


### Added

* add CSV-style quoted fields ([4f9f880](https://github.com/haiix/Docfilly/commit/4f9f880ffa9866813d74b2a70fc952f52be44ab8))
* add Docfilly default update API ([30a43d5](https://github.com/haiix/Docfilly/commit/30a43d5bfb2e43468d875cbbdb1a157a7129320a))
* add form descriptions ([3f9f605](https://github.com/haiix/Docfilly/commit/3f9f605cab497b6ff01bce91687ddff2863df27e)), closes [#48](https://github.com/haiix/Docfilly/issues/48)
* add if directives ([e67362a](https://github.com/haiix/Docfilly/commit/e67362a046bcc9060b783c206642c751c49177e1))
* add React wrapper package ([242797c](https://github.com/haiix/Docfilly/commit/242797c72297c912be28b56b33b1b1dddc6578ea))
* add string case filters ([7bc7e48](https://github.com/haiix/Docfilly/commit/7bc7e48318ec6822c8a1bfd176ccde427021d8cd))
* support saved initial form values ([bc5b051](https://github.com/haiix/Docfilly/commit/bc5b051457ebf77eb0975c7ead14d2c7a34558d9))
* **web:** add help and diagnostics dialogs ([164078e](https://github.com/haiix/Docfilly/commit/164078eb42013752af9bb81ce15e6846633de14b))
* **web:** export rendered documents ([9920cdb](https://github.com/haiix/Docfilly/commit/9920cdb0d901b0991839a88a9a3038ea3a58d721))
* **web:** refresh viewer layout ([ec96992](https://github.com/haiix/Docfilly/commit/ec96992686e70597198e2f96283a96ed1bcd2ccf)), closes [#32](https://github.com/haiix/Docfilly/issues/32)
* **web:** restore last document session ([4147161](https://github.com/haiix/Docfilly/commit/4147161985376d8137f42629e273735b8a6ed77d))
* **web:** save current values as Docfilly ([69e49ff](https://github.com/haiix/Docfilly/commit/69e49ff405e1b72a799b72b2652be774ec418a34))
* **web:** support drag-and-drop file loading ([b5762b7](https://github.com/haiix/Docfilly/commit/b5762b7a6c830c6135b7100b39b7b8455175e4a3))


### Fixed

* avoid backtracking when updating defaults ([1c1c20b](https://github.com/haiix/Docfilly/commit/1c1c20b18b8dd8de45fd7618ff459738efea32b7))
* resolve docfilly source during web development ([91a2501](https://github.com/haiix/Docfilly/commit/91a2501dcc7c458f26a3e86880ea9b89926c059a))
* treat uppercase checkbox as checked ([e26cabc](https://github.com/haiix/Docfilly/commit/e26cabc49b3b67e54784572092fc8c6b6e34ee8d))


### Changed

* **web:** migrate app to React ([e8ced7a](https://github.com/haiix/Docfilly/commit/e8ced7a113dcf2dabb4d4537e27932bfb1aed626))


### Documentation

* add TSDoc comments to functions ([8a0f19d](https://github.com/haiix/Docfilly/commit/8a0f19d40eb44a8eff8c99e4f870d2ecd850ded8))
* align documentation with product concept ([09c8f6a](https://github.com/haiix/Docfilly/commit/09c8f6a41950e7549ba6d386bc3c4cca754cb639))
* clarify Markdown delimiter spacing ([b726c31](https://github.com/haiix/Docfilly/commit/b726c318d61d8e57e12f7be837b59c7c1b4420b7))
