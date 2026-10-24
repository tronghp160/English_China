# Lighthouse after V3

Same setup as `lighthouse-before.md`: mobile preset, production build (`next start`, port 3200), local machine, 3 runs, `/today` with the demo account cookie. Code: branch `v3-lively` after P13 (P14 only changed touch-target sizes and docs). V3 §11 allows at most 5 points less Performance.

| Page | Performance | Accessibility | LCP ms | TBT ms | CLS | Transfer KB | Runs (perf) | Before |
|---|---|---|---|---|---|---|---|---|
| /login | 84 | 100 | 4396 | 82 | 0 | 619 | 81/84/84 | 87 |
| /today | 71 | 96 | 6490 | 96 | 0 | 810 | 71/68/71 | 67 |

- `/login`: median 84, 3 points under the V2 baseline (87), inside the 5-point budget. The new auth panel adds about 50 KB (motion, word cards) and some main-thread time (TBT 53 → 82 ms).
- `/today`: median 71, 4 points better than the baseline (67) and 88 KB lighter on the wire; the level bar and quest card did not cost anything measurable.
- Why `motion` is cheap: `LazyMotion` with `domMax` loads once for the app; `canvas-confetti` is imported on first use only; sounds are synthesized (no audio files).
- Measured with `lighthouse@12` through `npx`; on Windows it ends with an EPERM while deleting its temp profile after the report is written, which does not affect the numbers.
