"""One-shot: add partType.* i18n keys to all 12 locale files for PR3.

Lookup is case-insensitive, so we use lowercase keys.

Run: py scripts/add_part_type_keys.py
"""
import json
from pathlib import Path

I18N_DIR = Path(__file__).parent.parent / "src" / "assets" / "i18n"

PART_TYPES = {
    "hadith": {
        "en": "Hadith",
        "ar": "حديث",
        "fa": "حدیث",
        "ur": "حدیث",
        "tr": "Hadis",
        "id": "Hadis",
        "bn": "হাদিস",
        "es": "Hadiz",
        "de": "Hadith",
        "ru": "Хадис",
        "fr": "Hadith",
        "zh": "圣训",
    },
    "verse": {
        "en": "Verse",
        "ar": "آية",
        "fa": "آیه",
        "ur": "آیت",
        "tr": "Ayet",
        "id": "Ayat",
        "bn": "আয়াত",
        "es": "Versículo",
        "de": "Vers",
        "ru": "Аят",
        "fr": "Verset",
        "zh": "节",
    },
    "chapter": {
        "en": "Chapter",
        "ar": "باب",
        "fa": "باب",
        "ur": "باب",
        "tr": "Bölüm",
        "id": "Bab",
        "bn": "অধ্যায়",
        "es": "Capítulo",
        "de": "Kapitel",
        "ru": "Глава",
        "fr": "Chapitre",
        "zh": "章节",
    },
    "heading": {
        "en": "Heading",
        "ar": "عنوان",
        "fa": "عنوان",
        "ur": "عنوان",
        "tr": "Başlık",
        "id": "Judul",
        "bn": "শিরোনাম",
        "es": "Encabezado",
        "de": "Überschrift",
        "ru": "Заголовок",
        "fr": "En-tête",
        "zh": "标题",
    },
    "volume": {
        "en": "Volume",
        "ar": "مجلد",
        "fa": "جلد",
        "ur": "جلد",
        "tr": "Cilt",
        "id": "Jilid",
        "bn": "খণ্ড",
        "es": "Volumen",
        "de": "Band",
        "ru": "Том",
        "fr": "Volume",
        "zh": "卷",
    },
    "book": {
        "en": "Book",
        "ar": "كتاب",
        "fa": "کتاب",
        "ur": "کتاب",
        "tr": "Kitap",
        "id": "Kitab",
        "bn": "বই",
        "es": "Libro",
        "de": "Buch",
        "ru": "Книга",
        "fr": "Livre",
        "zh": "书",
    },
    "section": {
        "en": "Section",
        "ar": "قسم",
        "fa": "بخش",
        "ur": "حصہ",
        "tr": "Bölüm",
        "id": "Bagian",
        "bn": "বিভাগ",
        "es": "Sección",
        "de": "Abschnitt",
        "ru": "Раздел",
        "fr": "Section",
        "zh": "部分",
    },
    "surah": {
        "en": "Surah",
        "ar": "سورة",
        "fa": "سوره",
        "ur": "سورہ",
        "tr": "Sure",
        "id": "Surat",
        "bn": "সূরা",
        "es": "Sura",
        "de": "Sure",
        "ru": "Сура",
        "fr": "Sourate",
        "zh": "章",
    },
    "ayah": {
        "en": "Ayah",
        "ar": "آية",
        "fa": "آیه",
        "ur": "آیت",
        "tr": "Ayet",
        "id": "Ayat",
        "bn": "আয়াত",
        "es": "Aleya",
        "de": "Aya",
        "ru": "Аят",
        "fr": "Verset",
        "zh": "节",
    },
}


def main() -> None:
    locales = sorted(p.stem for p in I18N_DIR.glob("*.json"))
    print(f"Found {len(locales)} locales: {locales}")

    for lang in locales:
        path = I18N_DIR / f"{lang}.json"
        with path.open(encoding="utf-8") as f:
            data = json.load(f)

        if "partType" not in data:
            data["partType"] = {}

        added = 0
        for key, translations in PART_TYPES.items():
            if key in data["partType"]:
                continue
            value = translations.get(lang) or translations["en"]
            data["partType"][key] = value
            added += 1

        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"{lang}.json: +{added} partType keys")


if __name__ == "__main__":
    main()
