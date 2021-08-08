import { MultiLingualText } from './text';

export interface ChainVerses {
	narrator_ids: number[];
	verse_paths: string[];
}
export interface Narrator {
  index: string;
  path: string;
  titles: MultiLingualText;
  descriptions: MultiLingualText;
	verse_paths: string[];
	subchains: Record<string, ChainVerses>;
}

export interface NarratorList {
  kind: 'person_list';
  index: string;
  data: Record<number, string>;
}

export interface NarratorContent {
  kind: 'person_content';
  index: string;
  data: Narrator;
}


export type NarratorWrapper = NarratorList | NarratorContent;
