import React, { useEffect, useState } from "react";
import { 
  Search, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Megaphone, 
  Music, 
  Image as ImageIcon, 
  Youtube, 
  TrendingUp, 
  AlertTriangle 
} from "lucide-react";
import { PipelineStatus } from "../types";

interface AgentStatusVisualizerProps {
  status: PipelineStatus;
  progress: number;
  companyName: string;
  error?: string;
}

interface AgentStep {
  key: PipelineStatus;
  label: string;
  sub: string;
  icon: React.ComponentType<any>;
}

const AGENT_STEPS: AgentStep[] = [
  { key: "researching", label: "Research AI Agent", sub: "Gathering founder history, timeline, and financials", icon: Search },
  { key: "verifying", label: "Fact Verification Agent", sub: "Validating figures, CEOs, and dates", icon: CheckCircle2 },
  { key: "storytelling", label: "Storytelling AI Agent", sub: "Drafting Netflix-style cinematic documentary outline", icon: FileText },
  { key: "scripting", label: "Script Agent", sub: "Writing 8-15 min script, Shorts layout, voice narrative, & SRT captions", icon: Youtube },
  { key: "generating_prompts", label: "Thumbnail & Prompt Agent", sub: "Designing thumbnail ideas, AI image/video prompts", icon: ImageIcon },
  { key: "seo_metadata", label: "SEO Agent", sub: "Optimizing title, description, chapters, and bg music", icon: TrendingUp },
  { key: "social_media", label: "Social Media Agent", sub: "Writing promotional content & engagement comment quiz", icon: Megaphone },
];

export default function AgentStatusVisualizer({
  status,
  progress,
  companyName,
  error,
}: AgentStatusVisualizerProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (status === "idle") {
      setLogs(["[System] Pipeline queued. Waiting for worker allocation..."]);
      return;
    }
    if (status === "failed") {
      setLogs((prev) => [
        ...prev,
        `[CRITICAL] Error occurred: ${error || "Unknown error during execution."}`,
      ]);
      return;
    }

    const logTemplates: { [key: string]: string[] } = {
      researching: [
        `[Research] Launching extensive scan for "${companyName}"...`,
        `[Research] Scraping founder background and initial motivation...`,
        `[Research] Compiling chronological milestone history...`,
        `[Research] Retrieving historical revenue estimates and IPO transitions...`,
        `[Research] Analyzing major strategic product failures (smartphone transition, brand shifts)...`,
        `[Research] Extracting controversies and key acquisitions...`,
      ],
      verifying: [
        `[Verification] Cross-referencing founder names and dates...`,
        `[Verification] Checking financial revenue statistics for consistency...`,
        `[Verification] Validating timeline milestones and acquisition years...`,
        `[Verification] Double-checking CEO transitions and tenure years...`,
        `[Verification] Formulating the official validation report and sources index...`,
      ],
      storytelling: [
        `[Storytelling] Activating narrative director suite...`,
        `[Storytelling] Constructing dramatic tension arc (Rise, Domination, Fall, Resurrection)...`,
        `[Storytelling] Crafting signature opening hook comparing old boots/paper to global telco...`,
        `[Storytelling] Structuring Markdown outline with theatrical acts and emotional pacing...`,
      ],
      scripting: [
        `[Scripting] Structuring full 8-15 minute audio/visual YouTube script...`,
        `[Scripting] Injecting scene-by-scene B-roll visual directives...`,
        `[Scripting] Formulating AI-TTS pacing markers ([Pause], [Slow], [Normal])...`,
        `[Scripting] Compiling timed SRT subtitles (00:00:00 --> 00:01:00)...`,
        `[Scripting] Creating high-retention 30s/45s/60s vertical Shorts layouts...`,
        `[Scripting] Generating 20 diverse psychological opening hooks...`,
      ],
      generating_prompts: [
        `[Thumbnail] Devising thumbnail visual layouts (Text overlay, broken crowns, classic logos)...`,
        `[Prompts] Writing 5 highly detailed AI image generator prompts with 8K style modifiers...`,
        `[Prompts] Writing 5 cinematic drone and reconstruction video prompts...`,
      ],
      seo_metadata: [
        `[SEO] Analyzing video transcript for keyword density...`,
        `[SEO] Testing 10 high-CTR title variations (search SEO vs. clickbait balance)...`,
        `[SEO] Constructing complete video description and metadata block...`,
        `[SEO] Mapping chapters and calculating timestamps...`,
        `[SEO] Recommending mood-fitting background music (Pianos, Epic Orchestras, Dark Ambients)...`,
      ],
      social_media: [
        `[Social] Drafting formatted Instagram posts with tags...`,
        `[Social] Formatting high-engagement Threads post line-up...`,
        `[Social] Engineering tight, under-280-char X (Twitter) promotional post...`,
        `[Social] Writing corporate leadership case study for LinkedIn...`,
        `[Social] Formulating 3 comment-engagement trivia quiz questions...`,
        `[System] Compilation of YouTube Creator Asset Package completed.`,
      ],
    };

    const currentLogs = logTemplates[status] || [];
    if (currentLogs.length > 0) {
      setLogs([`[System] Entering agent state: ${status.toUpperCase()}`, ...currentLogs]);
    }
  }, [status, companyName, error]);

  const getStepStatus = (stepKey: PipelineStatus) => {
    const stepIndex = AGENT_STEPS.findIndex((s) => s.key === stepKey);
    const activeIndex = AGENT_STEPS.findIndex((s) => s.key === status);

    if (status === "failed") {
      if (stepKey === status) return "failed";
      return stepIndex < activeIndex ? "completed" : "pending";
    }

    if (status === "completed") return "completed";
    if (stepKey === status) return "active";
    return stepIndex < activeIndex ? "completed" : "pending";
  };

  return (
    <div id="agent-visualizer" className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl max-w-3xl mx-auto my-6 text-white font-sans">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase">Active AI Multi-Agent Pipeline</span>
          <h2 className="text-2xl font-semibold text-slate-100 tracking-tight mt-1">
            Analyzing {companyName}
          </h2>
        </div>
        <div className="text-right">
          <span className="text-3xl font-mono font-bold text-emerald-400">{progress}%</span>
          <p className="text-xs text-slate-400 font-mono mt-1 uppercase">Assembly Progress</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
        <div 
          className="bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(52,211,153,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Pipeline Steps List */}
      <div className="space-y-4 mb-6">
        {AGENT_STEPS.map((step) => {
          const stepStatus = getStepStatus(step.key);
          const StepIcon = step.icon;

          return (
            <div 
              key={step.key} 
              className={`flex items-start gap-4 p-3 rounded-lg transition-all duration-300 ${
                stepStatus === "active" 
                  ? "bg-slate-800/60 border border-emerald-500/30" 
                  : "bg-slate-900/40 border border-transparent"
              }`}
            >
              <div className="mt-0.5">
                {stepStatus === "completed" && (
                  <div className="bg-emerald-500/10 p-1.5 rounded-full text-emerald-400 ring-2 ring-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                {stepStatus === "active" && (
                  <div className="bg-emerald-400/20 p-1.5 rounded-full text-emerald-400 animate-pulse ring-2 ring-emerald-400/30">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {stepStatus === "pending" && (
                  <div className="bg-slate-800 p-1.5 rounded-full text-slate-600">
                    <StepIcon className="w-5 h-5" />
                  </div>
                )}
                {stepStatus === "failed" && (
                  <div className="bg-red-500/15 p-1.5 rounded-full text-red-400 ring-2 ring-red-500/30">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className={`text-sm font-medium ${
                    stepStatus === "completed" ? "text-slate-200" :
                    stepStatus === "active" ? "text-emerald-400 font-semibold" :
                    stepStatus === "failed" ? "text-red-400" : "text-slate-500"
                  }`}>
                    {step.label}
                  </h4>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded tracking-wider">
                    {stepStatus === "completed" && <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Processed</span>}
                    {stepStatus === "active" && <span className="text-emerald-400 animate-pulse bg-emerald-400/10 px-1.5 py-0.5 rounded">Executing</span>}
                    {stepStatus === "pending" && <span className="text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">Waiting</span>}
                    {stepStatus === "failed" && <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Aborted</span>}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${
                  stepStatus === "active" ? "text-slate-300" : "text-slate-500"
                }`}>
                  {step.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Agent Console Logs */}
      <div className="bg-black/80 rounded-lg p-4 font-mono text-[11px] text-slate-300 border border-slate-800">
        <div className="flex items-center justify-between mb-2 text-slate-500 border-b border-slate-900 pb-2">
          <span>CONSOLE LOGS</span>
          <span className="animate-pulse flex items-center gap-1.5 text-emerald-400 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> LIVE STREAM
          </span>
        </div>
        <div className="h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {logs.map((log, i) => (
            <div key={i} className={
              log.includes("[CRITICAL]") ? "text-red-400 font-bold" :
              log.includes("[System]") ? "text-emerald-400" :
              log.includes("[Verification]") ? "text-blue-400" :
              log.includes("[Storytelling]") ? "text-yellow-400" :
              log.includes("[Scripting]") ? "text-indigo-300" :
              log.includes("[Thumbnail]") ? "text-purple-400" : "text-slate-300"
            }>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
