# Spark AI Content Roadmap

> **Created:** 2026-08-12
> **Status:** IDEA COLLECTION — items 1-8 captured for future planning, none scheduled yet.
> Items 9-10 are IN PROGRESS with uncommitted working-tree changes (see their sections).
> **Purpose:** Track candidate AI-content workloads for the DGX Spark (Qwen 3.6-35B, $0 marginal cost).
> The Spark changes the economics of everything below: work previously priced in hundreds/thousands of
> dollars of API spend (see `PIPELINE_OPTIMIZATION_PLAN.md`) becomes compute-time-only. See
> `PHASE4_OPENWEIGHT_BENCHMARK.md` and `SPARK_OPTIMIZATION_LOG.md` for the production integration
> (99.5% parse rate, ~17 s/verse via `--phase1-model`/`--phase4-model qwen36-fast`), and
> `PATH_B_SPARK_LOG.md` for the completed word-translation precedent (~113K words × 11 langs at $0).

---

## Item Summary

| # | Item | Type | Overlaps with | Status |
|---|------|------|---------------|--------|
| 1 | Fill 10-language AI translation gaps | Gap fill | `CONSOLIDATED_ROADMAP.md` P1 | IDEA |
| 2 | Word-by-word translation: gaps + accuracy review | Gap fill + QA | `WORDS_PROJECT_PLAN.md`, `PATH_B_SPARK_LOG.md` | IDEA |
| 3 | Robust narrator canonicalisation (stable IDs, resolve "his father" etc.) | Entity resolution | `CONSOLIDATED_ROADMAP.md` §3.5, `canonical_narrators.json` | IDEA |
| 4 | Research book + narrator info, translate into 10 langs | Enrichment | `CONSOLIDATED_ROADMAP.md` §3.5 (narrator bios) | IDEA |
| 5 | Chapter names in 10 languages — completeness | Gap fill | `CHAPTER_TRANSLATION_GAP.md` (P1.4) | IDEA |
| 6 | Chapter summaries with point-level dedup | New content | — (new) | IDEA |
| 7 | Narrator insights: same-topic clustering + independent-chain analysis | Analysis | Narrator insights panel (chapter sidecars) | IDEA |
| 8 | Cross-corpus similar-narration detection ("plagiarism"-style matching) | Analysis | — (new; feeds #6 and #7) | IDEA |
| 9 | Chunk-align existing scraped translations to AI chunks | Alignment | `align-scraped` pipeline command (built; pilot-verified) | IN PROGRESS |
| 10 | Word regen determinism + surface translation quality | Stability + QA | `WORDS_PROJECT_PLAN.md`, item #2; fixes in working tree | IN PROGRESS |

**Shared foundation:** items 6, 7, and 8 all depend on the same primitive — deciding when two
narrations are "talking about the same thing." Whatever similarity/clustering machinery gets built
first should be designed to serve all three.

---

## 1. Fill gaps in the 10-language AI translations

Sweep the entire AI-content corpus for verses whose `translations.{lang}` blocks are missing,
empty, or partial (batch failures, pre-validation-fix runs, books that simply haven't been
generated yet), and re-run Phase 4 on the Spark for exactly those gaps.

- As of the 2026-06-14 per-book scan, coverage is ~90%+ for most books but laggards remain
  (uyun 47%, sifat-al-shia 40%, kitab-al-duafa 34%), plus per-verse partial gaps inside
  "covered" books from the old Phase 4 silent-swallow bug (fixed in `e84f106`/`c03601b`, but
  earlier output may still be partial on disk).
- **Approach:** a gap-audit script that walks `ai-content/corpus/responses/` and reports
  missing-language matrix per book → feed the gap list to the phased pipeline with
  `--phase4-model qwen36-fast`.
- Prerequisite: none — production integration already smoke-tested.

## 2. Word-by-word translation: review gaps and accuracy

Two sub-tasks against the ThaqalaynWords data:

- **Gaps:** Path B left 0.8% of lemmas (101) and 1.3% of surfaces (~1,328) untranslated.
  Identify why they failed (parse errors, odd orthography, hapax forms) and retry with
  adjusted prompting.
- **Accuracy:** a review pass over the existing 11-language glosses — sample-based or full —
  scoring translations against the classical definitions (Lane's, Hawramani) now available for
  45.9% of entries. Flag suspect glosses for regeneration. This is the deferred "Round 5" from
  `PATH_B_SPARK_LOG.md`: no systematic issues were known at ship time, but no dedicated
  accuracy audit has ever run.

## 3. Robust narrator categorisation + stable canonical IDs

Make narrator identity resolution genuinely reliable. Today `canonical_narrators.json`
(~4,544 entries) consolidates surface-name variants, but resolution is name-string based.
Goals:

- **One stable, reliable canonical ID per real person**, even when the same person appears
  under different names/kunyas/nisbas across books ("Abu Ja'far", "Muhammad b. Ali",
  "al-Baqir" → same ID).
- **Resolve relative/anaphoric references**: "his father" (عن أبيه), "his grandfather",
  "some of our companions", "a man from Kufa" — where resolvable, these should map to the
  actual person's canonical ID (e.g. "'Ali b. Ibrahim, from his father" → Ibrahim b. Hashim),
  using chain context and genealogical knowledge. Where genuinely unresolvable, classify the
  reference type explicitly rather than leaving it as an opaque string.
- **Categorisation:** era/generation (tabaqa), role (Imam, companion, transmitter, compiler),
  and relationship links (father-of, student-of) as structured fields.

The registry's append-only rule stays: IDs never reused; merges recorded as aliases.
This is the highest-leverage item on the list — items 4 and 7 both improve with it, and every
existing narrator page/hover-card/insights feature inherits the fix. LLM does the candidate
resolution; a verification pass (cross-checking genealogy claims against the chains themselves)
guards against hallucinated merges. Recommend a pilot on one well-understood book (al-Kafi vol 1)
with manual spot-checks before corpus-wide application.

## 4. Research + gather info on books and narrators, translated into 10 languages

Two enrichment batches:

- **Narrators:** biographical paragraph, death date (Hijri), epithets/kunya/nisba, reliability
  classification, multi-language names + bio translations — this is exactly
  `CONSOLIDATED_ROADMAP.md` §3.5 (already re-costed to $0 on Spark); execute it there.
  Depends on #3 for a stable ID set worth enriching.
- **Books (new):** per-book scholarly information — author biography, compilation history,
  significance, methodology, scholarly reception — surfaced on book landing pages, and
  translated into all 10 UI languages. Ships as enriched book metadata in `index/books.json`
  or a per-book `about` sidecar.
- Same hallucination caveats as §3.5: confidence flags, spot-check pilot, prefer citing rijal
  sources (Najashi, Tusi) where the model can ground its claims.

## 5. Chapter names in 10 languages — completeness

`CHAPTER_TRANSLATION_GAP.md` already scoped this: ~7,798 chapter/book names × 8 missing
languages ≈ 62,400 translations, previously priced at ~$6-31 via OpenAI batch. On Spark it is
$0 and small (short strings, well within Qwen's demonstrated competence from Path B).

- Includes the downstream work the gap doc lists: generating `books.{lang}.json` index files
  and the Angular `MultiLingualText` consumption path (partially prepared — English fallback
  already race-safe per `CONSOLIDATED_ROADMAP.md` §2.1).
- Also audit chapters whose *English* names are missing or transliterated-only.
- Good first Spark batch: low risk, bounded, unblocks a long-standing P1.4 item.

## 6. Chapter summaries with point-level deduplication

A new per-chapter AI artifact: a summary of the distinct **points** made in the chapter, where
multiple narrations making the same point collapse into one summarised point (with the
supporting narration refs listed), rather than a narration-by-narration recap.

- Output sketch: `{chapter}.summary.json` sidecar —
  `points: [{ text, translations…, supporting_verses: [paths], strength: n_narrations }]`.
- Chapters are small enough (typically 3-30 narrations) to fit a whole chapter in one context
  window, so the clustering can be done by the model directly per chapter.
- Translate the summary points into the 10 languages (Phase-4-style pass).
- UI: natural companion to the existing narrator insights panel — a "What this chapter
  establishes" block at the top of chapter pages.
- Shares the "same point?" primitive with #7 and #8 — the supporting_verses clustering here
  is essentially #7's topic clustering, produced as a byproduct.

## 7. Narrator insights: same-topic vs different-topic narration clustering + chain independence

Extend the chapter narrator-insights sidecars (`{chapter}.narrators.json`) beyond structural
chain analysis into **content-aware corroboration**:

- Cluster narrations within a chapter by whether they report the same point/event
  (LLM judgement, cf. #6) vs. different matters that merely share a chapter.
- For each same-topic cluster, analyse the chains: do the narrations arrive via **disjoint
  chains (no shared narrators)** — i.e. genuinely independent corroboration — or do they all
  funnel through a common link? Surface this as an explicit independence verdict per cluster.
- This upgrades the existing corroboration metric (currently structural only: identical/
  overlapping chains) with the missing semantic half: "3 independent chains report this same
  point" is a far stronger signal than "3 narrations exist in this chapter."
- Depends on: #3 (chain independence is only as good as narrator identity resolution —
  unresolved "his father" refs create false independence) and shares clustering with #6.

## 8. Cross-corpus similar-narration detection

Detect narrations that report the same content **across chapters and books** — a
plagiarism-detector-style matcher over the whole ~58K-narration corpus (e.g. the same hadith
appearing in al-Kafi and Tahdhib with minor matn variation, or the same event reported in
different words).

- **Two-stage approach** (single-stage LLM comparison is O(n²) ≈ 1.7B pairs — infeasible):
  1. **Cheap candidate generation** (programmatic, $0, no LLM): matn n-gram/shingle overlap
     (MinHash/LSH), or embedding nearest-neighbours if an Arabic embedding model runs on the
     Spark. Diacritics-stripped, normalised text.
  2. **LLM verification on Spark**: for each candidate pair, judge same-content /
     related-content / unrelated, and characterise the variation (verbatim, abridged,
     paraphrased, different-event-same-theme).
- Output: a cross-reference graph — per-verse `similar_narrations: [{path, relation, score}]`,
  merged into verse_detail as a "This narration also appears in…" section (the
  `related_narrations` UI slot already exists on verse-detail pages).
- Feeds #6/#7 directly (cluster membership across books strengthens corroboration analysis)
  and complements the existing programmatic cross-validation/diff-viewer work.
- Note: the existing narrator-chain data gives a strong prior — near-identical chains across
  books are high-probability duplicates and can seed the candidate set cheaply.

## 9. Chunk-align existing scraped translations to AI chunks

Scraped human translations (HubeAli, Sarwar, Qarai, …) are flat whole-verse blocks; AI content
is chunked (isnad / body / quran_quote / closing). Aligning the scraped text to the AI chunks
gives every translation the interleaved "Arabic segment ↔ its translation" reading view, not
just the AI ones.

**Already built** (pilot-verified end-to-end on al-amali-mufid + al-kafi incl. HubeAli and
Sarwar):

- Generator: `align-scraped` pipeline command — extractive re-segmentation on Spark/Qwen at $0,
  reusing the durable harness (resumable per-verse artifacts, strict JSON schema, quarantine).
  Anchors on the AI's own English per-chunk translation as a same-language reference
  (commits `e938070` → `dd486b7`, quality fix `f45e24d`).
- Storage: aligned parts land in the per-language sister file (`{path}.en.json` →
  `chunk_translations`) and the flat text is removed from base — no duplication.
  `align_status` tool wired into `add_data`.
- Frontend: `Verse.chunk_translations` model, interleaved rendering for scraped IDs, HubeAli
  `<sup>` markup, sister-file fetch per selected translation incl. compare mode
  (commits `663ca71` → `1fcdaef`, `f62fe55`).

**Remaining:**

1. **Strict validation** (decided, not yet applied): tighten `validate_alignment` from 90%
   fuzzy token overlap (`MIN_RECALL = 0.90`, `chunk_alignment_phase.py:56`) to an exact check —
   `join(parts)` must equal the original modulo whitespace, else quarantine and keep the base
   block text. Critical because the sister parts are the *sole* copy of the scraped text:
   a dropped word is lost data.
2. **Full-corpus Spark run** — only pilot samples aligned so far.
3. **Future phase**: complete "all translations in language files, none in base" migration
   (current state is the alignment-scoped hybrid). Related: `PER_LANGUAGE_VERSE_SPLIT.md`.

## 10. Word regen stability + surface translations that make sense

The 2026-07-05 word regen attempt produced a ~114K-file diff with **zero input changes** —
pure non-determinism (~84% of surfaces just re-stamped `generated_date`; ~12K lemmas had
paradigm arrays reshuffled; ~600 lemma slugs flipped identity, e.g. singular → dual, breaking
page URLs and re-pointing ~16K surface links). The regen was discarded and root causes fixed.

**Fixed in working tree (uncommitted as of 2026-08-12):** deterministic logprob tiebreak in
`get_best_analysis` + total-order paradigm sort (`morphology.py`), sorted-candidate pick in
`canonical_diacritized_lemma` (`builders.py`), `PYTHONHASHSEED=0` in `regen_words.ps1`,
per-file `generated_date` replaced with a single `index/words_version.json`. Validated:
identical output across two hash seeds; 240 word tests pass.

**Remaining:**

1. **Principled tiebreak** (recommended option from the diagnosis session): the lexicographic
   backstop currently *decides* which lemma ~6.4% of surfaces link to (~6,500 words) and the
   slug for ~5% of lemma pages. Replace with: exact-diacritization match → `pos_lex_logprob`
   → POS priority → shortest lemma → lexicographic backstop.
2. **Full-rebuild validation** — determinism proven on a sample, not a complete
   `regen_words.ps1` run; then commit the whole change coherently.
3. **Surface translations that make sense** — a pre-existing lemmatization-quality bug class,
   independent of determinism: surfaces linked to the wrong lemma (e.g. أَخَّرَهُ "he delayed
   it" → آخَر "other") inherit nonsensical glosses. Audit wrong-lemma links (CAMeL analysis
   ranking, possibly Spark LLM adjudication on ambiguous cases) and re-gloss affected
   surfaces. Overlaps the accuracy half of item #2 — run them together.

---

## Sequencing sketch (not committed)

0. **#9 + #10 first — both are in-flight with uncommitted work.** #9 needs the strict
   validation edit, then a full-corpus Spark run; #10 needs the principled tiebreak +
   full-rebuild validation, then a commit. Finishing these unblocks clean word/data regens
   for everything below.
1. **#5 chapter names** — smallest, bounded, unblocks P1.4. Good Spark warm-up batch.
2. **#1 translation gap fill** — mechanical, pipeline already supports it.
3. **#2 word-by-word gaps + accuracy** — bounded follow-up to Path B.
4. **#3 narrator canonicalisation** — highest leverage; prerequisite for 4 and 7.
5. **#4 book + narrator research** — after #3 stabilises IDs.
6. **#8 cross-corpus similarity** — candidate-generation stage can start any time (no LLM);
   verification on Spark.
7. **#6 chapter summaries + #7 content-aware insights** — last, consuming #3 and #8 outputs.

All items: $0 API cost, Spark compute time is the only budget. Zero-recurring-cost constraint
unaffected (Spark is owned hardware; outputs are static JSON on existing free Netlify sites).
