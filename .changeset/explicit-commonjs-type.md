---
'pascal-tokenizer': patch
'pascal-parser': patch
'pascal-js-compiler': patch
---

Declare `"type": "commonjs"` explicitly in package.json. The packages already ship
CommonJS; stating it removes Node's module-type detection step for consumers (as flagged
by publint) and brings these three in line with `pascal-code-formatter`.
