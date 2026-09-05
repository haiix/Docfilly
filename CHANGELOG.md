# Changelog

## [0.3.0](https://github.com/haiix/Docfilly/compare/v0.2.0...v0.3.0) (2026-09-05)


### Added

* **web:** add document restoration setting ([#132](https://github.com/haiix/Docfilly/issues/132)) ([3b1b4af](https://github.com/haiix/Docfilly/commit/3b1b4af8211a9794679251c0fc2d49e5f277e4ec))
* **web:** add persistent settings dialog ([#130](https://github.com/haiix/Docfilly/issues/130)) ([c7da10d](https://github.com/haiix/Docfilly/commit/c7da10dab5eb026d940774364ecb4528efdd5c83))
* **web:** add system-aware dark theme ([#131](https://github.com/haiix/Docfilly/issues/131)) ([f0fff1e](https://github.com/haiix/Docfilly/commit/f0fff1ed9ae98848e5839e7c19c8aaa1c13a66b0))
* **web:** make the settings form follow the scroll on desktop ([#133](https://github.com/haiix/Docfilly/issues/133)) ([5f54bce](https://github.com/haiix/Docfilly/commit/5f54bce41bdfbc466fe877f9a2d3b550f7a55b19))


### Fixed

* **web:** close help after app data reset ([#124](https://github.com/haiix/Docfilly/issues/124)) ([f3a6f29](https://github.com/haiix/Docfilly/commit/f3a6f291915c7016e3d68f05cca96b0d8deec351))


### Documentation

* **web:** improve built-in tutorial samples ([#123](https://github.com/haiix/Docfilly/issues/123)) ([52b9796](https://github.com/haiix/Docfilly/commit/52b9796f87086c4bfc452e768bf919c592f14503))

## [0.2.0](https://github.com/haiix/Docfilly/compare/v0.1.0...v0.2.0) (2026-08-28)


### Added

* **core:** localize diagnostics ([#88](https://github.com/haiix/Docfilly/issues/88)) ([5e33f9e](https://github.com/haiix/Docfilly/commit/5e33f9e711636e5c2b8a313e8b57b80ad38642b8))
* **web:** add document close and delete confirmation ([9835cfd](https://github.com/haiix/Docfilly/commit/9835cfd1aabc8459eb5c82f783715155bc130913))
* **web:** add offline PWA support ([#106](https://github.com/haiix/Docfilly/issues/106)) ([2184f3b](https://github.com/haiix/Docfilly/commit/2184f3b6d4875ac82e4441ae57f6f97831aff888))
* **web:** improve overflow menu interactions ([7c624bf](https://github.com/haiix/Docfilly/commit/7c624bf6fee84b28c39062ccdad5e266b9b19d7a))
* **web:** localize viewer in English and Japanese ([#89](https://github.com/haiix/Docfilly/issues/89)) ([00afbe9](https://github.com/haiix/Docfilly/commit/00afbe9bc9fe3fff47679fa6fb262bc8b5c0aa68))
* **web:** replace saved data deletion with app reset ([#108](https://github.com/haiix/Docfilly/issues/108)) ([d180d77](https://github.com/haiix/Docfilly/commit/d180d7783e4f3bdfedbb1fe7167074e3a3707910))


### Fixed

* **web:** emphasize destructive data action ([4a1cbed](https://github.com/haiix/Docfilly/commit/4a1cbedd08730e6b0bf3a17c69dfea7ccd905b96))
* **web:** flush pending render before export ([#116](https://github.com/haiix/Docfilly/issues/116)) ([07cd463](https://github.com/haiix/Docfilly/commit/07cd463e2d22d03eb1991948c2e4d461858a1c8f))
* **web:** improve icon rendering at small sizes ([#100](https://github.com/haiix/Docfilly/issues/100)) ([e2c2b9d](https://github.com/haiix/Docfilly/commit/e2c2b9da9750738a28db39295db6ba3ac3207933))
* **web:** prevent layout overflow on narrow screens ([#87](https://github.com/haiix/Docfilly/issues/87)) ([03b5988](https://github.com/haiix/Docfilly/commit/03b598832574d82f9485cfc7ebe10d57e1d36f2e))
* **web:** prevent stale file reads from replacing selection ([#117](https://github.com/haiix/Docfilly/issues/117)) ([9cd3c44](https://github.com/haiix/Docfilly/commit/9cd3c445ce55c3a610cce2b092f0387df45946bb))
* **web:** serialize document session persistence ([#118](https://github.com/haiix/Docfilly/issues/118)) ([ff59d5b](https://github.com/haiix/Docfilly/commit/ff59d5b54eda183cc073edc87c82b34e932e2cff))
* **web:** show blockquote border ([#105](https://github.com/haiix/Docfilly/issues/105)) ([3c94a03](https://github.com/haiix/Docfilly/commit/3c94a031f0e0cb130f6de6fb38dc074920c150f9))
* **web:** style dialog cancel action ([99671c3](https://github.com/haiix/Docfilly/commit/99671c3cfd25b02247ce274b2d5e1eef4b19ca8d))
* **web:** style Markdown tables ([#119](https://github.com/haiix/Docfilly/issues/119)) ([b1095cc](https://github.com/haiix/Docfilly/commit/b1095cc1dbfc976331e0534e59638c818bfba567))


### Changed

* **core:** separate document evaluation from DOM rendering ([#104](https://github.com/haiix/Docfilly/issues/104)) ([d8b4833](https://github.com/haiix/Docfilly/commit/d8b4833e8fb26075d9fda379c8103ff110225ae4))
* **core:** separate template processing stages ([#103](https://github.com/haiix/Docfilly/issues/103)) ([5ab3f2c](https://github.com/haiix/Docfilly/commit/5ab3f2cf08190ddeedb5b708afdb14a9865184fe))
* **core:** Standardize the handling of fields with quotation marks ([#99](https://github.com/haiix/Docfilly/issues/99)) ([4fb4668](https://github.com/haiix/Docfilly/commit/4fb4668d27bdf7a76b90258b373debc9f2d07564))
* **web:** centralize document format metadata ([#98](https://github.com/haiix/Docfilly/issues/98)) ([9f66931](https://github.com/haiix/Docfilly/commit/9f669316aab256c10fd3d7c740723cb9b4012b53))
* **web:** separate document state and persistence ([#101](https://github.com/haiix/Docfilly/issues/101)) ([7f53af4](https://github.com/haiix/Docfilly/commit/7f53af42fc79cc46ec854bd7467ff8aec90ad9ca))


### Documentation

* add repository contributor guide ([#90](https://github.com/haiix/Docfilly/issues/90)) ([b802336](https://github.com/haiix/Docfilly/commit/b802336b0589200934d3d6e4229d8d2b8aee5c2e))
* **web:** add Docfilly overview to help ([0b0018d](https://github.com/haiix/Docfilly/commit/0b0018d340fd0b097a445e9d04a88714a45f0b8e))
* **web:** refine built-in sample tutorial ([#80](https://github.com/haiix/Docfilly/issues/80)) ([24a81c4](https://github.com/haiix/Docfilly/commit/24a81c4130d8d2c265166b25644b012b470846d1))
* **web:** refine help content and actions ([#86](https://github.com/haiix/Docfilly/issues/86)) ([3c6f2be](https://github.com/haiix/Docfilly/commit/3c6f2bee1c7261d3a522b1ddf9ecfb5d24dc46f0))
* **web:** turn built-in sample into tutorial ([#79](https://github.com/haiix/Docfilly/issues/79)) ([d3f2b79](https://github.com/haiix/Docfilly/commit/d3f2b79c1c18dcd5b3b610a666dab0d4623d4e6e))

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
