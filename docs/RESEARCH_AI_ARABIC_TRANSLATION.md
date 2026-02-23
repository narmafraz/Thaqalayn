# Research: AI/LLM Translation of Arabic Religious Texts — Best Practices

> **Date:** 2026-02-23
> **Purpose:** Survey existing research, papers, and practical experience with using LLMs to translate Arabic religious texts (Quran, Hadith). Identify prompt engineering techniques, quality strategies, and pitfalls relevant to the Thaqalayn AI content pipeline.

---

## Key Takeaways for Thaqalayn

1. **Few-shot prompting is the single most effective technique** for controlling output quality, format, diacritics, and honorific handling. 5-10 examples demonstrating exact desired output significantly outperforms zero-shot and instruction-only approaches.
2. **Back-translation validation** is a proven scalable quality metric — translate Arabic→English, then back-translate with an independent model, compare via cosine similarity. Used on 250,000+ pages in the Al-Shamela project.
3. **RAG (Retrieval-Augmented Generation)** is the consensus approach for grounding religious content — reduces hallucination to <1% when combined with re-ranking.
4. **Claude ranks first in 9/11 language pairs at WMT24** and is specifically recommended for cultural nuance in Arabic translation.
5. **Automatic metrics (BLEU, ROUGE) are insufficient** for evaluating religious text translation — human expert review remains necessary.
6. **Diacritization should be handled by specialized tools** (CAMeL Tools, Tashkeel) as preprocessing, not delegated purely to the LLM.
7. **Temperature 0.5 or lower** is recommended for religious content to reduce creative hallucination.
8. **Explicit instructions about honorifics, citations, and source attribution** are necessary — LLMs will not consistently apply these without being told.

---

## 1. Prompt Engineering Techniques

### Role Assignment and Context Specification

The most effective technique is assigning the LLM a specialized role with detailed context. Rather than "translate this text," effective prompts specify the domain, audience, tone, and register. For example: "Act as a professional Arabic-to-English translator specializing in classical Islamic jurisprudence texts, targeting an English-speaking Muslim audience, maintaining a formal scholarly tone."

### Glossary Integration

Providing bilingual glossaries of key terms before translation significantly improves consistency. The prompt should instruct: "Use the attached glossary. Prioritize glossary terms and avoid synonyms unless specified." Critical for Islamic terminology where terms like "fiqh," "ijtihad," or "isnad" have specific technical meanings.

### Few-Shot Prompting

Research from "Building Domain-Specific LLMs Faithful To The Islamic Worldview" found that **few-shot prompting outperformed both zero-shot and instruction-based methods** across most models, achieving optimal F1-scores and smallest embedding distances. Providing 5-10 example translations with the exact formatting, terminology, and encoding desired is the single most effective technique.

**Practical guidance for hadith translation:**
1. Provide 5-10 complete hadith translations showing the exact format desired
2. Include examples covering different hadith structures (short, long, with/without commentary)
3. Show consistent honorific handling across all examples
4. Include examples with narrator chain formatting
5. Demonstrate the desired handling of technical terms (transliterate vs. translate)

### Multi-Shot Examples for Diacritics

The OpenAI developer community specifically recommends giving "five or ten similar writing examples" demonstrating the exact text encoding and formatting desired. Since most Arabic web text lacks diacritics, LLMs default to undiacritized output unless shown otherwise through examples.

### Structured Output Formats

Using clear delimiters, JSON schemas, or XML-tagged segments prevents confusion when translating multi-part content. Especially important for hadith texts that have distinct components (chain of narrators, body text, commentary).

### Positive Framing

Structure instructions affirmatively (specify desired outcomes) rather than negatively (listing what to avoid).

---

## 2. Instructions That Help with Arabic Religious Text Quality

### For General Islamic Translation

- Specify the register (classical vs. modern standard Arabic)
- Instruct to preserve Islamic technical terminology in transliteration where appropriate
- Request citation of source references (surah:ayah, hadith collection and number)
- Instruct the model to distinguish between direct quotation of scripture and interpretive commentary
- Specify handling of honorifics explicitly

### For Hadith Translation Specifically

- Instruct to separate the chain of narration (isnad) from the body (matn)
- Specify how narrator names should be transliterated
- Request preservation of hadith grading information (sahih, hasan, da'if)
- Include instructions about maintaining the distinction between different hadith collections

### For Quranic Text

- Explicitly instruct that Quranic verses must be quoted exactly, never paraphrased
- Request verse citations in standard format (Surah Name:Ayah Number)
- Specify whether the output should be a translation or an interpretation (tafsir)

### Back-Translation Validation

From the Al-Shamela library project: translate Arabic to English, then back-translate to Arabic, and compare using cosine similarity of vector embeddings. Use an independent model for back-translation (e.g., translate with one provider, back-translate with another) to cross-validate.

---

## 3. Common Pitfalls

### Hallucination of Scripture

LLMs can fabricate Quranic verses, misquote hadith, or assign wrong verse numbers to correct quotations. The "Can LLMs Write Faithfully?" study found specific examples where a model claimed "Verse 2:282 supports equal testimonial capacity between men and women" when the verse actually pertains to financial testimony.

### Conflation of Weak and Authentic Narrations

Models may present weak (da'if) hadith narrations as if they were authentic (sahih), or fabricate hadith attributions entirely.

### Loss of Cultural and Theological Nuance

GPT-3 produced "understandable translations" of religious text but "cannot capture the cultural nuances." Issues include academic inappropriateness, failing to capture religious nuances, redundancy, translation gaps, and anglicization.

### Over-Literal vs. Over-Liberal Translation

Google Translate produced 76% literal translations of two-word prophetic hadiths, while Gemini was more meaning-focused at 63% sense-based. Neither extreme is ideal for religious texts.

### Collapsing Juristic Disagreement

AI systems risk "collapsing legitimate juristic disagreement into apparent consensus," presenting one school of thought's position as the universal Islamic position.

### Sectarian Bias

Models may encode subtle sectarian preferences from training data without disclosure, blending Sunni, Shia, Salafi, or other jurisprudential traditions without indicating which perspective is being presented.

### Diacritics Omission

Since most Arabic web text lacks diacritics, LLMs default to undiacritized output. Problematic for religious texts where diacritization changes meaning entirely (e.g., "ذهب" = "gold" or "he went" depending on diacritics).

---

## 4. Strategies for Specific Challenges

### Preserving Honorifics

- **Explicit prompt instruction**: Include in the system prompt exactly how each honorific should be handled
- **Glossary approach**: Provide a glossary mapping each Arabic honorific to its desired rendering
- **Few-shot examples**: Show 5-10 examples of correctly translated passages with honorifics preserved
- **Post-processing**: Apply regex-based post-processing to ensure honorifics are consistently applied

### Handling Classical Arabic vs. Modern Arabic

- **Specify the register explicitly** in the system prompt
- **Use specialized diacritization tools** (CAMeL Tools, Tashkeel) as preprocessing
- **Leverage OpenITI corpus** (2 billion words of premodern Islamicate texts) for reference
- **Quranic Arabic Corpus** provides detailed word-by-word morphological analysis

### Maintaining Theological Accuracy

- **RAG** is the consensus approach: ground all responses in verified primary sources. Aftina system reduced hallucination to 0.40% using RAG with a re-ranker
- **System prompt guardrails**: "Avoid issuing fatwas. Use Hadith cautiously as understood by scholars. Admit lack of knowledge when unsure."
- **Citation requirements**: All generated responses should be traceable to canonical sources
- **Multi-expert human validation**: Panels of 3-5 Islamic scholars across different madhabs

### Dealing with Arabic Diacritics/Tashkeel

- **Pre-processing pipeline**: Use dedicated tools (CAMeL Tools BERT disambiguator, Tashkeel by QCRI, libtashkeel) before passing text to the LLM
- **Multi-shot prompting**: Provide multiple examples of properly diacritized text
- **Post-processing validation**: Compare LLM output against known diacritized versions

### Word-by-Word Analysis and Root Extraction

- **Quranic Arabic Corpus** provides existing word-by-word grammar, syntax, and morphology for every Quran word
- **CAMeL Tools** provides morphological analysis, tokenization, lemmatization, and POS tagging
- **Root extraction** should be done as a separate NLP step, not delegated purely to the LLM

### Multi-Target Language Translation

- Claude 3.5 ranked first in 9/11 language pairs at WMT24
- Best practice from research: separate calls per language may preserve quality better than simultaneous multi-language output
- Including parallel/translated data in examples helps cross-lingual knowledge alignment

---

## 5. Benchmarks and Evaluations

### IslamicEval 2025 (Shared Task)

First shared task on capturing LLM hallucinations in Islamic content:
- **Span Detection** (Quran/Hadith): Best F1 = 90.06% (BurhanAI team)
- **Validation**: Best accuracy = 89.82% (TCE team)
- **Correction**: 66.56% accuracy using hierarchical matching

Source: [aclanthology.org/2025.arabicnlp-sharedtasks.67/](https://aclanthology.org/2025.arabicnlp-sharedtasks.67/)

### Islamic Content Generation

- GPT-4o: Islamic Accuracy 3.93/5, Citation 3.38/5
- Ansari AI: Islamic Accuracy 3.68/5, Citation 3.32/5
- Fanar: Islamic Accuracy 2.76/5, Citation 1.82/5

Source: [arxiv.org/html/2510.24438](https://arxiv.org/html/2510.24438)

### Quranic Translation (ChatGPT)

- El-Fatiha: BLEU 0.48, METEOR 0.78
- Closest to Thomas Irving's human translation

Source: [al-kindipublishers.org](https://al-kindipublishers.org/index.php/ijllt/article/view/7543)

### General Arabic Translation

- Claude 3.5 Sonnet: Ranked first in 9/11 language pairs at WMT24
- Professional translators rated Claude translations "good" more often than GPT-4, DeepL, or Google Translate
- Claude into-English: outperformed in 56.9% of pairs (FLORES-200)
- Claude from-English: outperformed in only 9.65% of pairs (directional bias)

Source: [transphere.com](https://www.transphere.com/claude-translation/)

### Aftina (Islamic Fatwa Generation)

- RAG + Re-ranker: 70.40% accuracy, 0.40% hallucination rate, 99.60% completeness

Source: [link.springer.com](https://link.springer.com/article/10.1007/s00521-025-11229-y)

### Two-Word Prophetic Hadiths

- Google Translate: 76% literal
- ChatGPT (GPT-3.5): 53% literal, 35% sense-based, 13% figurative
- Gemini: 21% literal, 63% sense-based, 16% figurative (most balanced)

Source: [academia.edu](https://www.academia.edu/124642205/)

---

## 6. Reducing Hallucination in Religious Text Translation

### RAG (Retrieval-Augmented Generation)

Consensus approach across all major research:
- **Aftina**: RAG + re-ranker reduced hallucination to 0.40%
- **FARSIQA**: FAIR-RAG achieved 97.0% Negative Rejection
- **MufassirQAS**: LangChain + FAISS, 2000-token chunks, k=5 nearest neighbors

### Back-Translation Validation

Translate Arabic→English, then use an independent model to translate back to Arabic, and measure cosine similarity. Used at scale in the Al-Shamela project (250k+ pages).

### Hierarchical Verification

The BurhanAI system used layered search: exact matching → normalized matching → fuzzy matching → semantic matching to verify Quran/Hadith quotes.

### Agent-Based Verification

The "Can LLMs Write Faithfully?" framework used a verification agent with dedicated tools:
- **Quran Ayah tool**: Retrieves and compares actual verses
- **Internet Search/Extract tools**: Validates scholarly sources
- **Classification**: confirmed, partially confirmed, unverified, or refuted

### System Prompt Guardrails

- Cite sources for every claim
- Say "I don't know" rather than fabricate
- Never paraphrase scripture
- Distinguish direct quotation from interpretation

### Temperature Control

Lower temperature (0.5 or below) reduces creative hallucination.

---

## 7. Relevant Tools and Resources

### Arabic NLP

| Tool | Purpose | Link |
|------|---------|------|
| CAMeL Tools | Morphological analysis, diacritization, POS tagging | [github.com/CAMeL-Lab/camel_tools](https://github.com/CAMeL-Lab/camel_tools) |
| Tashkeel (QCRI) | Arabic diacritization at scale | [tashkil.net](https://www.tashkil.net/) |
| libtashkeel | Open-source diacritization (Rust/Python/C++/WASM) | [github.com/mush42/libtashkeel](https://github.com/mush42/libtashkeel) |
| OpenITI | 2B words of premodern Islamicate texts | [openiti.org](https://openiti.org/) |
| Quranic Arabic Corpus | Word-by-word grammar for every Quran word | [corpus.quran.com](https://corpus.quran.com/) |

### Arabic-Specific LLMs

| Model | Notes |
|-------|-------|
| ALLaM (SDAIA) | Top Arabic MMLU, bilingual Arabic-English |
| Jais (MBZUAI/Inception) | 13B Arabic-centric, strong dialectal |
| JASMINE | Arabic GPT for few-shot, 300M-6.7B |

### Islamic AI Applications

| Application | Notes | Link |
|-------------|-------|------|
| Ansari Chat | Open-source RAG Islamic chatbot | [ansari.chat](https://ansari.chat/) |
| Hikma AI | Quran/Hadith semantic search + chat | [gethikma.app](https://www.gethikma.app/) |
| IslamGPT 1.0 | First AI for Arabic Islamic Studies | [cilecenter.org](https://www.cilecenter.org/) |

---

## 8. Published Papers (Bibliography)

1. Khair & Sawalha, "Automated Translation of Islamic Literature Using LLMs: Al-Shamela Library" (ACL 2025) — [aclanthology.org/2025.clrel-1.5/](https://aclanthology.org/2025.clrel-1.5/)
2. "Can LLMs Write Faithfully? Agent-Based Evaluation of Islamic Content" (Oct 2025) — [arxiv.org/html/2510.24438](https://arxiv.org/html/2510.24438)
3. "IslamicEval 2025: Capturing LLMs Hallucination in Islamic Content" (ArabicNLP 2025) — [aclanthology.org/2025.arabicnlp-sharedtasks.67/](https://aclanthology.org/2025.arabicnlp-sharedtasks.67/)
4. "Improving LLM Reliability with RAG: MufassirQAS" — [arxiv.org/pdf/2401.15378](https://arxiv.org/pdf/2401.15378)
5. "Building Domain-Specific LLMs Faithful To The Islamic Worldview" — [arxiv.org/html/2312.06652v1](https://arxiv.org/html/2312.06652v1)
6. "Aftina: Stability and Preventing Hallucination in Islamic Fatwa Generation" — [link.springer.com](https://link.springer.com/article/10.1007/s00521-025-11229-y)
7. "FARSIQA: Faithful RAG for Islamic QA" — [arxiv.org/abs/2510.25621](https://arxiv.org/abs/2510.25621)
8. "From RAG to Agentic RAG for Faithful Islamic QA" (Jan 2026) — [arxiv.org/abs/2601.07528](https://arxiv.org/abs/2601.07528)
9. "Islamic Chatbots in the Age of LLMs" (Jan 2026) — [arxiv.org/html/2601.06092](https://arxiv.org/html/2601.06092)
10. "Machine-Learning-based English Quranic Translation: Evaluation of ChatGPT" — [al-kindipublishers.org](https://al-kindipublishers.org/index.php/ijllt/article/view/7543)
11. "Effectiveness of GPT-3 in Translating Specialized Religious Text" — [sabapub.com](https://sabapub.com/index.php/jtls/article/view/762)
12. "Creating Arabic LLM Prompts at Scale" (Aug 2024) — [arxiv.org/abs/2408.05882](https://arxiv.org/abs/2408.05882)
13. "Translating Classical Arabic Verse: Human vs. AI" — [tandfonline.com](https://www.tandfonline.com/doi/full/10.1080/23311886.2024.2410998)
14. "AI Tools-aided Translation: Two-word Prophetic Hadiths" — [academia.edu](https://www.academia.edu/124642205/)
15. "Can LLMs Translate Arabic Accurately?" (Localazy) — [localazy.com](https://localazy.com/blog/ai-8-llm-arabic-models-tested-to-translate)
16. "Claude Translation: What the Research Reveals" — [transphere.com](https://www.transphere.com/claude-translation/)
17. "PalmX 2025: Benchmarking LLMs on Arabic and Islamic Culture" — [arxiv.org/html/2509.02550](https://arxiv.org/html/2509.02550)

---

## 9. Implications for Thaqalayn Pipeline

Based on this research, the following changes/additions to our AI_CONTENT_PIPELINE.md should be considered:

### Already Aligned

- Using Claude Opus (top WMT24 performer) -- confirmed as strong choice
- Explicit honorific instructions in system prompt
- CAMeL Tools for root cross-validation
- Quran reference validation against actual text
- Structured JSON output format
- AI attribution and labelling

### Should Consider Adding

1. **Few-shot examples in the prompt** — Add 5-10 representative hadith translation examples showing the exact output format desired. This is the single highest-impact improvement suggested by research.
2. **Back-translation spot check** — Already in pipeline as optional; research suggests making it standard (at least for 1% sample). Use a different provider/model for back-translation.
3. **Temperature setting** — Research recommends 0.5 or lower for religious content. Currently not specified in the pipeline design.
4. **Dedicated diacritization tools** — Consider running CAMeL Tools or Tashkeel as a preprocessing step to add diacritics BEFORE sending to the LLM, rather than relying solely on the LLM for diacritization. The LLM can then validate/correct rather than generate from scratch.
5. **Separate isnad from matn** — Explicitly instruct the model to treat the narrator chain separately from the hadith body in translation.
6. **Glossary of Islamic terms** — Provide a controlled vocabulary of ~200-300 Islamic terms with their preferred translations in each target language.
