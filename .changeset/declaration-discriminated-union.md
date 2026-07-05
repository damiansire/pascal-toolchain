---
'pascal-parser': minor
---

`Declaration` is now a discriminated union (`VariableDeclaration | FunctionDeclaration
| ProcedureDeclaration | ConstantDeclaration`) instead of one wide interface where every
field was optional. Each variant is exported and carries exactly the fields it has, so a
`switch (decl.type)` narrows to the concrete node with no cast — matching how `Statement`
and `Expression` already work. Consumers that switch on `decl.type` gain precise field
types; code that read fields like `decl.parameters` off a bare `Declaration` without
narrowing must now narrow first.
