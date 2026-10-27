# Release checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (unit + integration)
- [ ] `npm run build` succeeds; preview with `npm run preview`
- [ ] Manual pass: import sample ZIP → findings → docs → CI → checklist → all three exports
- [ ] Keyboard-only pass of import → findings → docs export
- [ ] 1366px and 390px viewport check (no horizontal overflow)
- [ ] `THIRD_PARTY_NOTICES.md` matches `package.json` versions
- [ ] Version bump + CHANGELOG entry + tag
