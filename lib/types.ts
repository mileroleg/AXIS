export type SearchFilters = {
  text: string;
  area?: string;
  salary_from?: string;
  only_with_salary?: boolean;
  experience?: string;
  employment?: string;
  schedule?: string;
};

export type VacancyCard = {
  id: string;
  name: string;
  alternate_url: string;
  employer?: { name: string };
  area?: { name: string };
  salary?: { from?: number; to?: number; currency?: string };
  published_at: string;
};

export type StoredVacancy = VacancyCard & {
  detailsLoaded?: boolean;
  descriptionText?: string;
  keySkills?: string[];
};

export type AggregatedTerm = {
  term: string;
  count: number;
};

export type SummaryResult = {
  tools: AggregatedTerm[];
  hard: AggregatedTerm[];
  soft: AggregatedTerm[];
  hhKeySkills: AggregatedTerm[];
};
