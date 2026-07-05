---
'pascal-js-compiler': patch
---

Fix silent codegen corruption when two arrays in different scopes share a name. Array
low-bounds were tracked in a single flat map keyed only by name, so a local `array[1..n]`
inside a subprogram overwrote the low-bound of a same-named outer array, making the outer
array's 1-based index offset wrong (writes/reads landed outside the allocated array). Array
scope is now snapshotted and restored around each subprogram body, so a homonym array in one
scope no longer changes the meaning of the same identifier in a sibling or outer scope.
