---
'pascal-parser': minor
---

Statement AST nodes now carry their real source location (`location.start` = the
line/column/offset of their first token), stamped in `parseStatement`. Previously
every node location was zeroed. This enables consumers to map a statement back to
its source line — the playground step-debugger being the first such consumer.
Expression and declaration nodes remain zeroed until they too have a position
consumer.
