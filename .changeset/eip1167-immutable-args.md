---
'@1001-digital/proxies': patch
---

`detectEip1167` now matches clones with immutable args appended after the 45-byte runtime (OpenZeppelin `Clones.cloneWithImmutableArgs`). Previously the exact-length check rejected them.
