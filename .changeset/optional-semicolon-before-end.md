---
"pascal-parser": patch
---

El parser ahora trata `;` como separador y no como terminador: el punto y coma
final antes de `end` (o `until`) es opcional, como en Pascal estándar. Dos
sentencias consecutivas siguen requiriendo `;` entre ellas.
