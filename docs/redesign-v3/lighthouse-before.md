# Lighthouse before V3

Mobile preset, production build (`pnpm start`, port 3200), local machine, median of 3 runs. Source: V2 merged code (main a75c7d8). `/today` uses the demo account session cookie. P14 compares against these numbers (V3 §11: Performance must not drop more than 5 points).

| Page | Performance | Accessibility | LCP ms | TBT ms | CLS | Transfer KB | Runs (perf) |
|---|---|---|---|---|---|---|---|
| /login | 87 | 100 | 4058 | 53 | 0 | 571 | 87/87/87 |
| /today | 67 | 96 | 6659 | 44 | 0 | 898 | 66/67/69 |
