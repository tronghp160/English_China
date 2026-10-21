# Data

- `cvdict.u8.gz`: CVDICT 1.0.1, Chinese–Vietnamese dictionary by Phong Phan
  (https://github.com/ph0ngp/CVDICT), based on CC-CEDICT. Licensed under
  Creative Commons Attribution-ShareAlike 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
  Gzipped, otherwise unchanged. Read by `lib/dict/zh.ts`.

English lookups are not stored here: `lib/dict/en.ts` fetches Vietnamese
Wiktionary (CC BY-SA) and dictionaryapi.dev at request time.
