export interface ResearchReport {
  founder: string;
  timeline: string;
  revenue: string;
  ceo: string;
  majorFailures: string;
  biggestSuccess: string;
  competitors: string;
  interestingFacts: string;
  controversies: string;
  products: string;
  acquisitions: string;
  hiddenStories: string;
}

export interface FactCheckReport {
  report: string;
  sources: string[];
}

export interface VideoScriptSuite {
  longScript: string; // 8-15 min with B-roll cues
  voiceOver: string; // pacing markup [Pause], [Slow]
  srt: string; // Captions in SRT format
  shortsScript: string; // 30s, 45s, 60s segments
  hooks: string[]; // 20 hook variations
}

export interface ThumbnailAndPrompts {
  ideas: string;
  imagePrompts: string[];
  videoPrompts: string[];
  generatedImages?: { [index: number]: string }; // Base64 data URLs of generated images
}

export interface SEOMetadata {
  titles: string[]; // 10 variations
  description: string;
  tags: string[];
  chapters: string; // timestamps
  bgMusic: string; // background music suggestions per chapter
}

export interface SocialMediaSuite {
  instagram: string;
  threads: string;
  x: string;
  facebook: string;
  linkedin: string;
  community: string;
  quiz: string; // Trivia quiz for comments
}

export type PipelineStatus =
  | 'idle'
  | 'researching'
  | 'verifying'
  | 'storytelling'
  | 'scripting'
  | 'generating_prompts'
  | 'seo_metadata'
  | 'social_media'
  | 'completed'
  | 'failed';

export interface ContentFactoryRun {
  id: string;
  companyName: string;
  status: PipelineStatus;
  progress: number; // 0 to 100 percentage
  error?: string;
  createdAt: string;
  research?: ResearchReport;
  factCheck?: FactCheckReport;
  storyOutline?: string;
  script?: VideoScriptSuite;
  thumbnail?: ThumbnailAndPrompts;
  seo?: SEOMetadata;
  social?: SocialMediaSuite;
}
