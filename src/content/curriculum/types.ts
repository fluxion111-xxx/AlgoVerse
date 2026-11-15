import type { CurriculumSource } from "./sources";

export type CurriculumChapter = readonly [id: string, title: string, coverage: string];
export type CurriculumCourse = {
  id: string;
  title: string;
  sources: readonly CurriculumSource[];
  chapters: readonly CurriculumChapter[];
};

export function curriculumCourse(
  id: string, title: string, sources: readonly CurriculumSource[], chapters: readonly CurriculumChapter[],
): CurriculumCourse {
  return { id, title, sources, chapters };
}
