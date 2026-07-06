import React, { useState } from "react";
import { 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  Music, 
  HelpCircle, 
  Youtube, 
  Megaphone, 
  Image as ImageIcon, 
  Info, 
  TrendingUp, 
  PenTool, 
  Save, 
  RefreshCw, 
  Search,
  ExternalLink,
  CheckCircle2,
  Download,
  UploadCloud,
  CheckSquare,
  Square,
  ArrowUpRight,
  Play,
  Film,
  Upload,
  Trash2
} from "lucide-react";
import JSZip from "jszip";
import { ContentFactoryRun } from "../types";
import { VideoCompiler } from "./VideoCompiler";

interface WorkspaceProps {
  run: ContentFactoryRun;
  onRefresh: () => void;
}

export default function Workspace({ run, onRefresh }: WorkspaceProps) {
  const [activeTab, setActiveTab] = useState<string>("script");
  const [copiedText, setCopiedText] = useState<{ [key: string]: boolean }>({});
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [editedValues, setEditedValues] = useState<{ [key: string]: string }>({});
  const [generatingImage, setGeneratingImage] = useState<{ [index: number]: boolean }>({});
  const [imageErrors, setImageErrors] = useState<{ [index: number]: string }>({});
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem(`yt_checklist_${run.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleChecklistItem = (key: string) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    try {
      localStorage.setItem(`yt_checklist_${run.id}`, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();

      // Create directories
      const scriptsFolder = zip.folder("scripts");
      const metadataFolder = zip.folder("metadata");
      const visualsFolder = zip.folder("visuals");
      const socialFolder = zip.folder("social_media");
      const researchFolder = zip.folder("research");

      // 1. Scripts Folder
      if (run.script) {
        scriptsFolder?.file("1_long_youtube_script.txt", run.script.longScript || "");
        scriptsFolder?.file("2_voice_over_pacing_optimized.txt", run.script.voiceOver || "");
        scriptsFolder?.file("3_subtitles_captions.srt", run.script.srt || "");
        scriptsFolder?.file("4_vertical_shorts_scripts.txt", run.script.shortsScript || "");
        scriptsFolder?.file(
          "5_20_opening_hooks.txt",
          (run.script.hooks || []).map((h, i) => `#${String(i + 1).padStart(2, "0")}\n${h}`).join("\n\n")
        );
      }

      // 2. SEO & Metadata Folder
      if (run.seo) {
        metadataFolder?.file("1_10_optimized_titles.txt", (run.seo.titles || []).map((t, i) => `${i + 1}. ${t}`).join("\n"));
        metadataFolder?.file("2_chapter_timestamps.txt", run.seo.chapters || "");
        metadataFolder?.file("3_background_music_pacing.txt", run.seo.bgMusic || "");
        metadataFolder?.file("4_upload_tags.txt", (run.seo.tags || []).join(", "));
        metadataFolder?.file("5_seo_upload_description.txt", run.seo.description || "");
      }

      // 3. Visuals & Prompts Folder
      if (run.thumbnail) {
        visualsFolder?.file("thumbnail_composition_ideas.txt", run.thumbnail.ideas || "");
        visualsFolder?.file(
          "ai_image_broll_prompts.txt",
          (run.thumbnail.imagePrompts || []).map((p, i) => `PROMPT #${i + 1}:\n${p}`).join("\n\n")
        );
        visualsFolder?.file(
          "ai_video_broll_prompts.txt",
          (run.thumbnail.videoPrompts || []).map((p, i) => `PROMPT #${i + 1}:\n${p}`).join("\n\n")
        );

        // Add generated images to visuals/images
        if (run.thumbnail.generatedImages) {
          const imagesFolder = visualsFolder?.folder("images");
          for (const [key, base64Url] of Object.entries(run.thumbnail.generatedImages)) {
            if (base64Url && base64Url.startsWith("data:image/")) {
              const base64Data = base64Url.split(",")[1];
              if (base64Data) {
                imagesFolder?.file(`generated_broll_image_${Number(key) + 1}.png`, base64Data, { base64: true });
              }
            }
          }
        }
      }

      // 4. Social & Promotions Folder
      if (run.social) {
        socialFolder?.file("instagram_promotion.txt", run.social.instagram || "");
        socialFolder?.file("x_twitter_post.txt", run.social.x || "");
        socialFolder?.file("threads_thread.txt", run.social.threads || "");
        socialFolder?.file("facebook_campaign.txt", run.social.facebook || "");
        socialFolder?.file("linkedin_case_study.txt", run.social.linkedin || "");
        socialFolder?.file("youtube_community_post.txt", run.social.community || "");
        socialFolder?.file("engagement_comments_quiz.txt", run.social.quiz || "");
      }

      // 5. Research & Verification Folder
      let resContent = "";
      if (run.factCheck) {
        resContent += `=== OFFICIAL VERIFICATION REPORT ===\n${run.factCheck.report || ""}\n\n`;
        resContent += `=== COMPILING SOURCE INDEX ===\n${(run.factCheck.sources || []).map((s, i) => `[Source ${i + 1}]: ${s}`).join("\n")}\n\n`;
      }
      if (run.storyOutline) {
        resContent += `=== DRAMATIC STORY outline ===\n${run.storyOutline}\n\n`;
      }
      if (run.research) {
        resContent += `=== RAW RESEARCH LEDGER ===\n`;
        resContent += `Founders: ${run.research.founder}\n\n`;
        resContent += `Timeline: ${run.research.timeline}\n\n`;
        resContent += `Revenue Metrics: ${run.research.revenue}\n\n`;
        resContent += `Leadership transitions: ${run.research.ceo}\n\n`;
        resContent += `Major strategic failures: ${run.research.majorFailures}\n\n`;
        resContent += `Defining Successes: ${run.research.biggestSuccess}\n\n`;
        resContent += `Controversies: ${run.research.controversies}\n\n`;
        resContent += `Products List: ${run.research.products}\n\n`;
        resContent += `Acquisitions: ${run.research.acquisitions}\n\n`;
        resContent += `Underdog Stories: ${run.research.hiddenStories}\n\n`;
      }
      researchFolder?.file("research_and_sources_ledger.txt", resContent);

      // Generate actual zip file blob
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${run.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_production_package.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("Error packaging ZIP download file.");
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedText((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const startEdit = (key: string, initialValue: string) => {
    setEditMode((prev) => ({ ...prev, [key]: true }));
    setEditedValues((prev) => ({ ...prev, [key]: initialValue }));
  };

  const saveEdit = async (section: string, field: string, subField?: string) => {
    const editKey = subField ? `${section}_${field}_${subField}` : `${section}_${field}`;
    const newValue = editedValues[editKey];

    try {
      const response = await fetch(`/api/runs/${run.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          field,
          subField,
          value: newValue,
        }),
      });

      if (response.ok) {
        setEditMode((prev) => ({ ...prev, [editKey]: false }));
        onRefresh();
      } else {
        alert("Failed to save changes. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving edits.");
    }
  };

  // Triggers Gemini to generate a real image for an image prompt
  const handleGenerateImage = async (promptIndex: number) => {
    setGeneratingImage((prev) => ({ ...prev, [promptIndex]: true }));
    setImageErrors((prev) => ({ ...prev, [promptIndex]: "" }));
    try {
      const response = await fetch(`/api/runs/${run.id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptIndex }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        setImageErrors((prev) => ({ 
          ...prev, 
          [promptIndex]: data.error || "Internal Error" 
        }));
      }
    } catch (err: any) {
      console.error(err);
      setImageErrors((prev) => ({ 
        ...prev, 
        [promptIndex]: "Network connection or server failed to respond." 
      }));
    } finally {
      setGeneratingImage((prev) => ({ ...prev, [promptIndex]: false }));
    }
  };

  const handleImageUploadForPrompt = async (promptIndex: number, file: File) => {
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Selected image exceeds 8MB file limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      if (!base64Image) return;

      try {
        const response = await fetch(`/api/runs/${run.id}/upload-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptIndex, base64Image }),
        });

        if (response.ok) {
          setImageErrors((prev) => ({ ...prev, [promptIndex]: "" }));
          onRefresh();
        } else {
          const data = await response.json();
          alert(`Failed to save uploaded image: ${data.error || "Internal Error"}`);
        }
      } catch (err) {
        console.error(err);
        alert("Error uploading image to server.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = async (promptIndex: number) => {
    try {
      const response = await fetch(`/api/runs/${run.id}/clear-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptIndex }),
      });

      if (response.ok) {
        setImageErrors((prev) => ({ ...prev, [promptIndex]: "" }));
        onRefresh();
      } else {
        alert("Failed to clear image.");
      }
    } catch (err) {
      console.error(err);
      alert("Error clearing image.");
    }
  };

  const renderEditArea = (
    section: string,
    field: string,
    subField?: string,
    isMarkdown = false
  ) => {
    const editKey = subField ? `${section}_${field}_${subField}` : `${section}_${field}`;
    let currentValue = "";

    if (!section) {
      currentValue = (run as any)[field] || "";
    } else if (subField) {
      currentValue = (run as any)[section]?.[field]?.[subField] || "";
    } else {
      currentValue = (run as any)[section]?.[field] || "";
    }

    if (editMode[editKey]) {
      return (
        <div className="space-y-3 mt-2">
          <textarea
            className="w-full h-96 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-4 font-mono text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
            value={editedValues[editKey] || ""}
            onChange={(e) =>
              setEditedValues((prev) => ({ ...prev, [editKey]: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditMode((prev) => ({ ...prev, [editKey]: false }))}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-md font-mono"
            >
              Cancel
            </button>
            <button
              onClick={() => saveEdit(section, field, subField)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-md shadow-lg font-mono transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative group">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button
            onClick={() => handleCopy(currentValue, editKey)}
            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 rounded-md shadow"
            title="Copy"
          >
            {copiedText[editKey] ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => startEdit(editKey, currentValue)}
            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 rounded-md shadow"
            title="Edit"
          >
            <PenTool className="w-4 h-4" />
          </button>
        </div>
        <div className={`p-4 bg-slate-950 border border-slate-900 rounded-lg overflow-y-auto max-h-[500px] whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300`}>
          {currentValue}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full text-slate-200">
      {/* Header Panel */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase">Workspace Assets</span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100 mt-1 flex items-center gap-2">
            {run.companyName} <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase font-mono">Factory Content</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Pipeline Run ID: {run.id} • Processed on {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-950 hover:bg-emerald-300 bg-emerald-400 font-bold rounded-lg font-mono transition-all shadow-[0_0_12px_rgba(52,211,153,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {downloadingZip ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Packaging ZIP...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Download ZIP Package
              </>
            )}
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded-lg font-mono transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Synchronize
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800 bg-slate-950 overflow-x-auto">
        <button
          onClick={() => setActiveTab("script")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono tracking-wide uppercase transition-all border-b-2 ${
            activeTab === "script"
              ? "border-emerald-400 text-emerald-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Youtube className="w-4 h-4" /> Scripts & Voice
        </button>
        <button
          onClick={() => setActiveTab("thumbnail")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono tracking-wide uppercase transition-all border-b-2 ${
            activeTab === "thumbnail"
              ? "border-emerald-400 text-emerald-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Thumbnail & B-Roll
        </button>
        <button
          onClick={() => setActiveTab("video_builder")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono tracking-wide uppercase transition-all border-b-2 ${
            activeTab === "video_builder"
              ? "border-emerald-400 text-emerald-400 bg-slate-900/40 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Film className="w-4 h-4 text-emerald-400 animate-pulse" /> Video Compiler Room
        </button>
        <button
          onClick={() => setActiveTab("seo")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono tracking-wide uppercase transition-all border-b-2 ${
            activeTab === "seo"
              ? "border-emerald-400 text-emerald-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> SEO & Titles
        </button>
        <button
          onClick={() => setActiveTab("social")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono tracking-wide uppercase transition-all border-b-2 ${
            activeTab === "social"
              ? "border-emerald-400 text-emerald-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Megaphone className="w-4 h-4" /> Social & Engagement
        </button>
        <button
          onClick={() => setActiveTab("research")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono tracking-wide uppercase transition-all border-b-2 ${
            activeTab === "research"
              ? "border-emerald-400 text-emerald-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Search className="w-4 h-4" /> Research & Sources
        </button>
        <button
          onClick={() => setActiveTab("publish")}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono tracking-wide uppercase transition-all border-b-2 ${
            activeTab === "publish"
              ? "border-emerald-400 text-emerald-400 bg-slate-900/40"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <UploadCloud className="w-4 h-4 text-emerald-400" /> Publish to YouTube
        </button>
      </div>

      {/* Workshop Space */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
        {/* TAB 1: SCRIPT & VOICE */}
        {activeTab === "script" && run.script && (
          <div className="space-y-8 animate-fade-in">
            {/* Hooks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> 20 Engaging Opening Hooks
                </h3>
                <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 font-mono rounded border border-slate-850">
                  Select for Title Intro
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                {run.script.hooks.map((hook, i) => (
                  <div key={i} className="flex gap-3 items-start border-b border-slate-900/60 pb-2 last:border-0 last:pb-0">
                    <span className="text-xs font-mono text-slate-500 mt-0.5">#{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-xs text-slate-300 font-sans">{hook}</p>
                    <button
                      onClick={() => handleCopy(hook, `hook_${i}`)}
                      className="ml-auto p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {copiedText[`hook_${i}`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Long Video Script */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">🎬 Long Youtube Script (8-15 mins)</h3>
                <p className="text-[11px] text-slate-400 font-sans">Full cinematic narrator scripts with scene B-roll direction and camera cue guidelines.</p>
                {renderEditArea("script", "longScript")}
              </div>

              {/* Voice-Over Script */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">🎙️ Pacing-Optimized Voice-Over Narrator</h3>
                <p className="text-[11px] text-slate-400 font-sans">Formatted for professional Text-to-Speech AI engines using [Pause] and [Slow] style tags.</p>
                {renderEditArea("script", "voiceOver")}
              </div>
            </div>

            {/* SRT & Shorts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">📝 Captions / SRT Subtitles File</h3>
                <p className="text-[11px] text-slate-400 font-sans">Intro minute captions block in standard SRT format ready for upload.</p>
                {renderEditArea("script", "srt")}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">📱 Short Vertical Videos Script</h3>
                <p className="text-[11px] text-slate-400 font-sans">30-sec, 45-sec, and 60-sec fast-retention layouts for YouTube Shorts and TikTok.</p>
                {renderEditArea("script", "shortsScript")}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THUMBNAIL & B-ROLL */}
        {activeTab === "thumbnail" && run.thumbnail && (
          <div className="space-y-8 animate-fade-in">
            {/* Thumbnail Ideas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">🖼️ Thumbnail Composition Concept</h3>
                <p className="text-[11px] text-slate-400 font-sans">Structural blueprint, focal subject, copy text, and tone recommendations.</p>
                {renderEditArea("thumbnail", "ideas")}
              </div>

              {/* Image Prompts and Generator */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">🎨 AI Image Prompts (Generative B-Roll)</h3>
                <p className="text-[11px] text-slate-400 font-sans">Generate real high-fidelity visual B-roll illustrations or historical frames with Gemini.</p>
                
                <div className="space-y-4">
                  {run.thumbnail.imagePrompts.map((prompt, i) => {
                    const generatedImage = run.thumbnail?.generatedImages?.[i];
                    return (
                      <div key={i} className="bg-slate-950 border border-slate-900 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-900 border border-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">PROMPT #{i + 1}</span>
                            <button
                              onClick={() => handleCopy(prompt, `img_prompt_${i}`)}
                              className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                              title="Copy prompt"
                            >
                              {copiedText[`img_prompt_${i}`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 font-mono leading-relaxed italic">"{prompt}"</p>
                          
                          {imageErrors[i] && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded text-xs font-sans mt-2 space-y-1">
                              <p className="font-semibold flex items-center gap-1 text-[11px]">
                                <Info className="w-3.5 h-3.5 text-rose-400" /> Image Generation Limit Exceeded (429)
                              </p>
                              <p className="text-[10px] text-rose-300 leading-normal font-mono">
                                The Gemini free tier rate limit was hit. No worries! You can either use our automatic high-contrast dark visual background or upload a custom image of your choice below.
                              </p>
                            </div>
                          )}

                          <div className="pt-2 flex flex-wrap gap-2 items-center">
                            <button
                              onClick={() => handleGenerateImage(i)}
                              disabled={generatingImage[i]}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-semibold rounded-md shadow-md font-mono transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {generatingImage[i] ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Rendering visual...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" /> Generate Image
                                </>
                              )}
                            </button>

                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-md shadow-md font-mono transition-all cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              Upload Image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUploadForPrompt(i, file);
                                }}
                              />
                            </label>

                            {generatedImage && (
                              <button
                                onClick={() => handleClearImage(i)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/60 text-rose-200 text-xs font-semibold rounded-md shadow-md font-mono transition-all cursor-pointer"
                                title="Clear Image"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Clear Image
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Image Output Box */}
                        <div className="w-full md:w-48 h-28 bg-slate-900 rounded border border-slate-800 flex items-center justify-center overflow-hidden self-center relative group">
                          {generatedImage ? (
                            <>
                              <img
                                src={generatedImage}
                                alt={`Generated visual prompt ${i + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleClearImage(i)}
                                  className="p-1.5 bg-rose-500 hover:bg-rose-600 text-slate-950 rounded shadow-md transition-colors"
                                  title="Clear / Reset"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-3 text-slate-600">
                              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-700 animate-pulse" />
                              <span className="text-[10px] font-mono block text-slate-400">Image Not Rendered</span>
                              <span className="text-[9px] text-slate-500 font-sans block mt-0.5">(Dark Canvas Fallback Active)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Video Prompts */}
            <div className="space-y-3 pt-6 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">🎥 AI Video B-Roll Prompts (Sora, Runway, Veo)</h3>
              <p className="text-[11px] text-slate-400 font-sans">Drone cinematic references, tracking angles, and lighting parameters for video rendering engines.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {run.thumbnail.videoPrompts.map((vprompt, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-900 p-4 rounded-lg space-y-2 relative group">
                    <button
                      onClick={() => handleCopy(vprompt, `vid_prompt_${i}`)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 p-1 bg-slate-900/60 border border-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedText[`vid_prompt_${i}`] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Video Prompt #{i + 1}</span>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed">"{vprompt}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SEO & TITLES */}
        {activeTab === "seo" && run.seo && (
          <div className="space-y-8 animate-fade-in">
            {/* Title options */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase mb-3 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-emerald-400" /> 10 Optimized High-CTR Video Titles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {run.seo.titles.map((title, i) => (
                  <div 
                    key={i} 
                    className="flex justify-between items-center bg-slate-950 border border-slate-900 hover:border-slate-850 p-3 rounded-lg group transition-all"
                  >
                    <div className="flex gap-2.5 items-center">
                      <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-center">{i + 1}</span>
                      <span className="text-xs font-semibold text-slate-200 font-sans">{title}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(title, `title_${i}`)}
                      className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy title"
                    >
                      {copiedText[`title_${i}`] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamps & Music */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-4">
              {/* Timeline chapters */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">⏱️ Chapter Timestamps Markers</h3>
                <p className="text-[11px] text-slate-400 font-sans">Ready-made markers to paste into description box for automatic YouTube timeline chapters.</p>
                {renderEditArea("seo", "chapters")}
              </div>

              {/* Music playlist curation */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-emerald-400" /> Atmospheric BG Music Curation
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">Musical arrangements, volume pacing, and instrument types recommended for each act/chapter.</p>
                {renderEditArea("seo", "bgMusic")}
              </div>
            </div>

            {/* Video Description */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">📝 SEO Optimized Description Text</h3>
              <p className="text-[11px] text-slate-400 font-sans">Complete long-form video description integrating titles, outline, standard social links, and SEO tags.</p>
              {renderEditArea("seo", "description")}
            </div>

            {/* Search Tags */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">🏷️ Upload SEO Search Tags</h3>
              <div className="flex flex-wrap gap-2">
                {run.seo.tags.map((tag, i) => (
                  <span 
                    key={i} 
                    onClick={() => handleCopy(tag, `tag_${i}`)}
                    className="bg-slate-950 border border-slate-850 hover:border-emerald-500/20 text-slate-300 px-2.5 py-1 text-[11px] font-mono rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    {tag}
                    {copiedText[`tag_${i}`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SOCIAL & ENGAGEMENT */}
        {activeTab === "social" && run.social && (
          <div className="space-y-8 animate-fade-in">
            {/* Social Cards Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Instagram Card */}
              <div className="space-y-2">
                <span className="text-[10px] bg-slate-950 text-emerald-400 border border-slate-800 font-bold font-mono px-2 py-0.5 rounded uppercase">Instagram promo</span>
                {renderEditArea("social", "instagram")}
              </div>

              {/* X / Twitter */}
              <div className="space-y-2">
                <span className="text-[10px] bg-slate-950 text-emerald-400 border border-slate-800 font-bold font-mono px-2 py-0.5 rounded uppercase">X Post (Twitter)</span>
                {renderEditArea("social", "x")}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              {/* Threads */}
              <div className="space-y-2">
                <span className="text-[10px] bg-slate-950 text-indigo-400 border border-slate-800 font-bold font-mono px-2 py-0.5 rounded uppercase">Threads Thread</span>
                {renderEditArea("social", "threads")}
              </div>

              {/* Facebook */}
              <div className="space-y-2">
                <span className="text-[10px] bg-slate-950 text-blue-400 border border-slate-800 font-bold font-mono px-2 py-0.5 rounded uppercase">Facebook Campaign</span>
                {renderEditArea("social", "facebook")}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              {/* LinkedIn professional post */}
              <div className="space-y-2">
                <span className="text-[10px] bg-slate-950 text-sky-400 border border-slate-800 font-bold font-mono px-2 py-0.5 rounded uppercase">LinkedIn Case Study</span>
                {renderEditArea("social", "linkedin")}
              </div>

              {/* Community post */}
              <div className="space-y-2">
                <span className="text-[10px] bg-slate-950 text-rose-400 border border-slate-800 font-bold font-mono px-2 py-0.5 rounded uppercase">YouTube Community post</span>
                {renderEditArea("social", "community")}
              </div>
            </div>

            {/* Interactive Comment Quiz */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-400" /> Comment Trivia Quiz (Comment Booster)
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">Pin this multiple-choice trivia challenge in your comments section to boost conversation velocity.</p>
              {renderEditArea("social", "quiz")}
            </div>
          </div>
        )}

        {/* TAB 5: RESEARCH & SOURCE LEDGER */}
        {activeTab === "research" && run.research && (
          <div className="space-y-8 animate-fade-in text-sans">
            {/* Fact verification and sources */}
            {run.factCheck && (
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-emerald-400 font-mono uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Official Fact Verification Report
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{run.factCheck.report}</p>
                <div className="border-t border-slate-900 pt-3">
                  <h4 className="text-xs font-semibold text-slate-400 font-mono uppercase mb-2">Sources Checked:</h4>
                  <div className="flex flex-wrap gap-2">
                    {run.factCheck.sources.map((src, i) => (
                      <span key={i} className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1 rounded text-xs flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3 text-emerald-400" /> {src}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Storytelling outline */}
            {run.storyOutline && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-mono uppercase">📖 Dramatic Storyboards Outline</h3>
                <div className="bg-slate-950 p-6 border border-slate-900 rounded-lg overflow-y-auto max-h-[300px] whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
                  {run.storyOutline}
                </div>
              </div>
            )}

            {/* Research fields detailed layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Founder */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400 font-mono uppercase">Founders & Start</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.founder}</p>
              </div>

              {/* Chronological Milestone */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400 font-mono uppercase">Milestone Timeline</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.timeline}</p>
              </div>

              {/* Financial metrics */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400 font-mono uppercase">Revenue Highs & Lows</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.revenue}</p>
              </div>

              {/* CEO Transitions */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400 font-mono uppercase">Leadership & CEOs</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.ceo}</p>
              </div>

              {/* Failures */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-rose-400 font-mono uppercase">Major Strategic Failures</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.majorFailures}</p>
              </div>

              {/* Successes */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400 font-mono uppercase">Biggest Defining Successes</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.biggestSuccess}</p>
              </div>

              {/* Competitors */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-slate-400 font-mono uppercase">Competitor Landscape</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.competitors}</p>
              </div>

              {/* Little-known trivia */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-yellow-400 font-mono uppercase">Little-Known Facts</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.interestingFacts}</p>
              </div>

              {/* Controversies */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-red-400 font-mono uppercase">PR Crises & Controversies</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.controversies}</p>
              </div>

              {/* Products list */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400 font-mono uppercase">Flagship Products History</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.products}</p>
              </div>

              {/* Corporate Acquisitions */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-indigo-400 font-mono uppercase">M&As / Acquisitions</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.acquisitions}</p>
              </div>

              {/* Hidden storytelling arcs */}
              <div className="bg-slate-950/60 p-4 border border-slate-900/80 rounded-lg space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400 font-mono uppercase">Underdog Secrets & Slingshot Stories</h4>
                <p className="text-xs text-slate-300 font-sans">{run.research.hiddenStories}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: VIDEO COMPILER STUDIO */}
        {activeTab === "video_builder" && (
          <div className="space-y-6 animate-fade-in text-slate-200">
            <VideoCompiler run={run} />
          </div>
        )}

        {/* TAB 6: PUBLISH TO YOUTUBE */}
        {activeTab === "publish" && (
          <div className="space-y-8 animate-fade-in text-slate-200">
            {/* Quick Upload Alert Box */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="space-y-1 max-w-2xl">
                <h3 className="text-base font-semibold text-emerald-400 flex items-center gap-2 font-mono">
                  <UploadCloud className="w-5 h-5" /> YouTube Creator Publishing Assistant
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  We've prepared your complete script, voiceover pacing, captions SRT, b-roll prompts, and description timestamps. Follow this step-by-step checklist to finalize your video and upload it to YouTube Studio.
                </p>
              </div>
              <a
                href="https://studio.youtube.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-bold font-mono rounded-lg shadow-md transition-colors whitespace-nowrap"
              >
                Open YouTube Studio <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Left Column: Interactive Checklist */}
              <div className="xl:col-span-5 space-y-4">
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase border-b border-slate-900 pb-2">
                    Production & Upload Checklist
                  </h4>
                  <div className="space-y-3.5">
                    {[
                      { key: "zip", label: "Download entire asset ZIP folder containing scripts and assets", sub: "Click 'Download ZIP Package' at the top of the workspace" },
                      { key: "audio", label: "Render Voice-Over / Narrative audio", sub: "Paste the pacing-optimized voiceover script into an AI TTS generator or narrate it manually" },
                      { key: "broll", label: "Generate B-Roll Imagery & Video", sub: "Render custom images using the high-fidelity prompts in the 'Thumbnail & B-Roll' tab" },
                      { key: "edit", label: "Edit the video inside CapCut / Premiere", sub: "Combine your narrator audio, B-rolls, and thematic background music" },
                      { key: "export", label: "Export the video file (MP4)", sub: "Recommended settings: 1080p or 4K at 24/30 FPS" },
                      { key: "open_studio", label: "Open YouTube Creator Studio", sub: "Go to studio.youtube.com and sign into your channel" },
                      { key: "drag_video", label: "Drag-and-drop the video file into YouTube Upload", sub: "This initiates the upload sequence" },
                      { key: "meta", label: "Copy-paste Title, Description, and Chapters", sub: "Use the Quick-Publish Clipboard Tool in the right panel" },
                      { key: "srt", label: "Upload the SRT captions file", sub: "Drag '3_subtitles_captions.srt' from your ZIP into YouTube Subtitles" },
                      { key: "thumb", label: "Upload custom Thumbnail", sub: "Select the most eye-catching rendered visual for your thumbnail" },
                      { key: "tags", label: "Add tags and set category", sub: "Paste standard search tags in the 'More options' section" },
                      { key: "publish_video", label: "Set visibility to Scheduled or Public", sub: "Your video is fully optimized and ready to captivate viewers!" }
                    ].map((step, i) => {
                      const isChecked = !!checklist[step.key];
                      return (
                        <div 
                          key={step.key} 
                          onClick={() => toggleChecklistItem(step.key)}
                          className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isChecked ? "bg-emerald-500/5" : "hover:bg-slate-900/40"
                          }`}
                        >
                          <button className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-700" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${isChecked ? "text-slate-400 line-through font-sans" : "text-slate-200 font-sans"}`}>
                              {i + 1}. {step.label}
                            </p>
                            <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-relaxed">{step.sub}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Copy-Paste Tool */}
              <div className="xl:col-span-7 space-y-6">
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-6 space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase border-b border-slate-900 pb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Quick-Publish Clipboard Tool
                  </h4>

                  {/* 1. SELECT TITLE */}
                  {run.seo?.titles && run.seo.titles.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 font-mono block uppercase">1. Pick and Copy Video Title</label>
                      <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 space-y-2">
                        {run.seo.titles.map((title, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 p-1.5 rounded hover:bg-slate-900/60 group transition-colors">
                            <span className="text-[10px] font-mono text-slate-600">#{i + 1}</span>
                            <span className="text-xs text-slate-200 font-sans truncate flex-1">{title}</span>
                            <button
                              onClick={() => handleCopy(title, `pub_title_${i}`)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-emerald-400 transition-colors"
                              title="Copy Title"
                            >
                              {copiedText[`pub_title_${i}`] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. OPTIMIZED DESCRIPTION WITH TIMESTAMPS Chapters */}
                  {run.seo && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400 font-mono block uppercase">2. Video Description (Includes Chapters)</label>
                        <button
                          onClick={() => {
                            const fullDesc = `${run.seo?.description || ""}\n\n=== VIDEO TIMESTAMPS ===\n${run.seo?.chapters || ""}`;
                            handleCopy(fullDesc, "pub_description_full");
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded font-mono text-emerald-400 transition-all cursor-pointer"
                        >
                          {copiedText["pub_description_full"] ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied Full Description!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Entire Description
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg h-60 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed">
                        {run.seo.description}
                        {"\n\n=== VIDEO TIMESTAMPS ===\n"}
                        {run.seo.chapters}
                      </div>
                    </div>
                  )}

                  {/* 3. TAGS */}
                  {run.seo?.tags && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400 font-mono block uppercase">3. Comma-Separated Tags Box</label>
                        <button
                          onClick={() => handleCopy((run.seo?.tags || []).join(", "), "pub_tags_full")}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded font-mono text-emerald-400 transition-all cursor-pointer"
                        >
                          {copiedText["pub_tags_full"] ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Tags Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Tags
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg font-mono text-xs text-slate-400 break-words leading-relaxed">
                        {(run.seo.tags || []).join(", ")}
                      </div>
                    </div>
                  )}

                  {/* 4. DOWNLOAD SHORTCUTS */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-400 font-mono block uppercase">4. Quick Assets Download Shortcuts</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {run.script?.srt && (
                        <button
                          onClick={() => {
                            const blob = new Blob([run.script?.srt || ""], { type: "text/plain" });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${run.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_subtitles.srt`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          }}
                          className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 rounded-lg text-xs font-mono text-slate-300 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-emerald-400" /> Download SRT Captions
                        </button>
                      )}

                      {run.thumbnail?.generatedImages && Object.keys(run.thumbnail.generatedImages).length > 0 ? (
                        <button
                          onClick={() => {
                            if (run.thumbnail?.generatedImages) {
                              Object.entries(run.thumbnail.generatedImages).forEach(([key, val]) => {
                                if (val && val.startsWith("data:image/")) {
                                  const a = document.createElement("a");
                                  a.href = val;
                                  a.download = `${run.companyName.toLowerCase()}_thumbnail_visual_${Number(key) + 1}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                              });
                            }
                          }}
                          className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 rounded-lg text-xs font-mono text-slate-300 transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 text-emerald-400" /> Download Rendered Images
                        </button>
                      ) : (
                        <div className="flex items-center justify-center p-3 bg-slate-900/40 border border-slate-900 rounded-lg text-xs font-mono text-slate-500 select-none">
                          No images generated yet
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
