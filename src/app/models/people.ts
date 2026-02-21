import { MultiLingualText } from './text';

export interface ChainVerses {
  narrator_ids: number[];
  verse_paths: string[];
}
export interface NarratorBiography {
  birth_date?: string;
  death_date?: string;
  era?: string;
  reliability?: string;
  teachers?: string[];
  students?: string[];
  biography_summary?: string;
  biography_source?: string;
  english_transliteration?: string;
}

export interface Narrator {
  index: string;
  path: string;
  titles: MultiLingualText;
  descriptions: MultiLingualText;
  verse_paths: string[];
  subchains: Record<string, ChainVerses>;
  biography?: NarratorBiography;
}

export interface NarratorMetadata {
  index: string;
  titles: MultiLingualText;
  narrations: number;
  narrated_from: number;
  narrated_to: number;
  conarrators: number;
}

export interface NarratorList {
  kind: 'person_list';
  index: string;
  data: Record<number, NarratorMetadata>;
}

export interface NarratorContent {
  kind: 'person_content';
  index: string;
  data: Narrator;
}


export type NarratorWrapper = NarratorList | NarratorContent;
