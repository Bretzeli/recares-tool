export type Priority = "high" | "medium" | "low" | "n/a";

export interface Tag {
  /** e.g. "AUE-3", or a bare label like "Web App". */
  id: string;
  description: string;
  /** Grouping from the tags sheet; "Uncategorized" when the sheet leaves it blank. */
  category: string;
  /** True when the tag is used by a user story but absent from us_tags.html. */
  undeclared: boolean;
  userStoryIds: number[];
}

export interface Persona {
  id: number;
  name: string;
  userStoryIds: number[];
}

export interface UserStory {
  id: number;
  text: string;
  originalText: string;
  category: string;
  priority: Priority;
  tagIds: string[];
  personaIds: number[];
}

export interface Dataset {
  personas: Persona[];
  userStories: UserStory[];
  tags: Tag[];
  /** Distinct user_story_category values, in first-seen order. */
  categories: string[];
  /** Distinct priorities present in the data. */
  priorities: Priority[];
  /** Non-fatal problems found while parsing — surfaced in the UI, never thrown. */
  issues: DataIssue[];
  sources: SourceFile[];
}

export interface DataIssue {
  severity: "warning" | "info";
  message: string;
}

export interface SourceFile {
  file: string;
  status: "loaded" | "missing" | "empty" | "ignored";
  rows: number;
  note?: string;
}

export const PRIORITY_ORDER: Priority[] = ["high", "medium", "low", "n/a"];
