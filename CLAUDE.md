# Valheim Companion: instrukce pro Claude Code

1. **Začni čtením `docs/STAV.md`.** Najdeš tam aktuální stav, frontu úloh, co právě běží a co čeká na Pavla.
2. Jak pouštět agenty (agy/zai), přejímat a mergovat: `docs/ORCHESTRACE.md`. Pasti v § 2 jsou z praxe, dodržuj je.
3. Analýza a rozhodnutí: `docs/ANALYZA.md`. Schéma dat: `docs/DATA-SCHEMA.md`. Zadání: `docs/zadani/VC-*.md`.

Zásady:
- Orchestrátor dělá analýzu, zadání, přejímku, merge a push. Kód píšou agenti (agy/zai). Výjimkou jsou drobné opravy při přejímce, označené „(orchestrator fix)“.
- Komunikace s Pavlem česky, web anglicky (UI se překládá do 13 jazyků, viz ANALYZA § 15), kód a commity anglicky.
- Po každé změně fronty nebo merge aktualizuj `docs/STAV.md` a commitni ho.
- Push do `main` = deploy na https://valheim-companion.teuferon.click (EasyPanel webhook).
