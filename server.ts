import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini SDK with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Resilient wrapper for Gemini content generation with exponential backoff and fallback models
async function generateContentWithRetry(options: {
  contents: any;
  config?: any;
  model?: string;
  retries?: number;
  initialDelayMs?: number;
}): Promise<any> {
  const {
    contents,
    config,
    model = "gemini-3.5-flash",
    retries = 3,
    initialDelayMs = 2000,
  } = options;

  let currentModel = model;
  let delay = initialDelayMs;

  for (let i = 0; i <= retries; i++) {
    try {
      console.log(`[Gemini Request] Calling ${currentModel} (Attempt ${i + 1}/${retries + 1})...`);
      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config,
      });
      return response;
    } catch (err: any) {
      console.error(`[Gemini Error] Attempt ${i + 1} with ${currentModel} failed:`, err?.message || err);

      const isRateLimitOrDemandSpike =
        err?.message?.includes("503") ||
        err?.message?.includes("experiencing high demand") ||
        err?.message?.includes("429") ||
        err?.status === 503 ||
        err?.status === 429;

      if (i === retries) {
        throw err;
      }

      if (isRateLimitOrDemandSpike && currentModel === "gemini-3.5-flash") {
        currentModel = "gemini-2.5-flash";
        console.log(`[Gemini Fallback] Switching model to ${currentModel} due to 503/429.`);
      } else if (isRateLimitOrDemandSpike && currentModel === "gemini-2.5-flash") {
        currentModel = "gemini-1.5-flash";
        console.log(`[Gemini Fallback] Switching model to ${currentModel} due to 503/429.`);
      }

      console.log(`[Gemini Retry] Waiting ${delay}ms before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

const HISTORY_FILE = path.join(process.cwd(), "runs_history.json");

// Helper to read runs history
function readHistory(): any[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading history file:", err);
  }
  return [];
}

// Helper to write runs history
function writeHistory(history: any[]) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing history file:", err);
  }
}

// Global active worker states
const activePipelines = new Set<string>();

// Asynchronous multi-agent execution worker
async function runMultiAgentPipeline(runId: string) {
  if (activePipelines.has(runId)) return;
  activePipelines.add(runId);

  const updateRun = (updater: (run: any) => void) => {
    const history = readHistory();
    const runIndex = history.findIndex((r) => r.id === runId);
    if (runIndex !== -1) {
      updater(history[runIndex]);
      writeHistory(history);
    }
  };

  try {
    const history = readHistory();
    const run = history.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found in history.");

    const company = run.companyName;
    console.log(`[Worker] Starting pipeline for ${company}`);

    // --- AGENT 1: Research Agent ---
    console.log(`[Worker] Step 1: Researching ${company}`);
    updateRun((r) => {
      r.status = "researching";
      r.progress = 10;
    });

    const researchPrompt = `Collect extensive historical, strategic, and corporate background research on the company: "${company}". Analyze their entire history. You must populate the structured JSON fields including: founder history, timeline of events, revenue details (highs and lows), CEO transitions and their impact, major strategic or product failures, their biggest successes or defining products, their main competitors across history, little-known interesting facts, any major controversies or legal dramas, flagship product listings, acquisitions made or been part of, and hidden story lines. Be informative, objective, and detailed.`;

    const researchResponse = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: researchPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            founder: { type: Type.STRING, description: "Founder name(s) and inception history." },
            timeline: { type: Type.STRING, description: "Chronological milestone summary of the company." },
            revenue: { type: Type.STRING, description: "Historical and current revenue, highs/lows." },
            ceo: { type: Type.STRING, description: "Current and notable former CEOs and leadership changes." },
            majorFailures: { type: Type.STRING, description: "Key failures, structural errors, or missed trends." },
            biggestSuccess: { type: Type.STRING, description: "Greatest successes, defining moments, or product heights." },
            competitors: { type: Type.STRING, description: "Major competitors and competitive landscape dynamics." },
            interestingFacts: { type: Type.STRING, description: "Little-known trivia and background facts." },
            controversies: { type: Type.STRING, description: "Controversies, scandals, or public relations nightmares." },
            products: { type: Type.STRING, description: "Key flagship products/services over the decades." },
            acquisitions: { type: Type.STRING, description: "Acquisitions made or history of being acquired." },
            hiddenStories: { type: Type.STRING, description: "Underdog stories, secrets, or dramatic turnarounds." },
          },
          required: [
            "founder",
            "timeline",
            "revenue",
            "ceo",
            "majorFailures",
            "biggestSuccess",
            "competitors",
            "interestingFacts",
            "controversies",
            "products",
            "acquisitions",
            "hiddenStories",
          ],
        },
      },
    });

    const researchData = JSON.parse(researchResponse.text || "{}");
    updateRun((r) => {
      r.research = researchData;
      r.status = "verifying";
      r.progress = 25;
    });

    // --- AGENT 2: Fact Verification Agent ---
    console.log(`[Worker] Step 2: Verifying facts for ${company}`);
    const factPrompt = `Review the following research report for "${company}" and verify every single date, financial figure, executive name, acquisition detail, market share statistic, and general company facts. In the verification report, list any corrections, flag potential errors or uncertainties, and summarize the confirmed true facts. Include a list of reputable sources or sites used for verification.

Research Report Data:
${JSON.stringify(researchData, null, 2)}`;

    const factResponse = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: factPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            report: { type: Type.STRING, description: "Detailed verification review of the numbers, dates, and claims with corrections." },
            sources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of verification sources (e.g., SEC, Wikipedia, corporate archives)." },
          },
          required: ["report", "sources"],
        },
      },
    });

    const factData = JSON.parse(factResponse.text || "{}");
    updateRun((r) => {
      r.factCheck = factData;
      r.status = "storytelling";
      r.progress = 40;
    });

    // --- AGENT 3: Storytelling AI Agent ---
    console.log(`[Worker] Step 3: Drafting storytelling outline for ${company}`);
    const storyPrompt = `You are an award-winning Netflix documentary director. Take the following verified research report and fact verification about "${company}" and turn it into a high-drama, story-driven cinematic documentary outline. Focus on the emotional rise and catastrophic fall, or the underdog triumph. Start with an exceptionally strong hook that challenges expectations (like how Nokia started as a paper mill or rubber boot company). Write a detailed acts layout in Markdown.

Research Report:
${JSON.stringify(researchData, null, 2)}

Fact-Check:
${JSON.stringify(factData, null, 2)}`;

    const storyResponse = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: storyPrompt,
    });

    const storyOutline = storyResponse.text || "";
    updateRun((r) => {
      r.storyOutline = storyOutline;
      r.status = "scripting";
      r.progress = 55;
    });

    // --- AGENT 4: Script Agent ---
    console.log(`[Worker] Step 4: Writing scripts and hooks for ${company}`);
    const scriptPrompt = `You are a master YouTube scriptwriter who specializes in tech and business history. Using the Netflix documentary outline, write a complete multi-asset video package. The package MUST contain:
1. A long, highly engaging 8-15 minute video script (longScript) complete with vivid scene descriptions, visual B-roll suggestions, pacing indicators, and audio cues, divided into logical narrative chapters.
2. An optimized voice-over script (voiceOver) for AI natural narration containing explicit markup like [Pause], [Slow], [Normal], [Energetic] to control pacing.
3. A fully valid SRT caption segment (srt) for the first minute of the intro (00:00:00 to 00:01:00) with proper timing formatting (00:00:01,000 --> 00:00:05,000).
4. A vertical YouTube Shorts script (shortsScript) containing segment layouts for 30s, 45s, and 60s lengths, with fast-paced visual instructions.
5. A list of exactly 20 creative, diverse, and psychologically captivating visual/narrative hook options (hooks) to open the video.

Documentary Outline:
${storyOutline}`;

    const scriptResponse = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: scriptPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            longScript: { type: Type.STRING, description: "Full YouTube video script with camera angles, visual cues, and narration." },
            voiceOver: { type: Type.STRING, description: "Pacing-optimized voice narrative with pauses, pitch, speed tags." },
            srt: { type: Type.STRING, description: "Intro segment srt file content." },
            shortsScript: { type: Type.STRING, description: "30s, 45s, and 60s shorts versions with visual cues." },
            hooks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "20 psychological video hooks." },
          },
          required: ["longScript", "voiceOver", "srt", "shortsScript", "hooks"],
        },
      },
    });

    const scriptData = JSON.parse(scriptResponse.text || "{}");
    updateRun((r) => {
      r.script = scriptData;
      r.status = "generating_prompts";
      r.progress = 70;
    });

    // --- AGENT 5: Thumbnail & Prompt Agent ---
    console.log(`[Worker] Step 5: Generating thumbnail ideas and visual prompts for ${company}`);
    const thumbnailPrompt = `You are a professional graphic designer and creative director for top-tier YouTube channels. Based on the script, generate creative visual assets ideas.
You must output:
1. Dynamic thumbnail ideas (ideas) detailing layout, primary focal point (e.g. 'Old Nokia Phone with Broken Crown'), text overlay (e.g. 'THE BIGGEST FALL IN TECH HISTORY'), and style description.
2. Exactly 5 highly detailed AI image generation prompts (imagePrompts) for historic scenes, abstract concept art, or dramatic reconstructions. Include specific modifiers (e.g., 'ultra realistic', 'cinematic lighting', '8K', 'Finland paper mill 1865').
3. Exactly 5 highly detailed AI video generation prompts (videoPrompts) for b-roll or intro clips. Include camera movements and atmosphere (e.g., 'Drone shot, old industrial Finland, snow, fog, paper mill, cinematic documentary, slow motion, 4K').

Script & Story context:
${scriptData.longScript.slice(0, 5000)}`;

    const thumbnailResponse = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: thumbnailPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: { type: Type.STRING, description: "List of thumbnail concepts, visual hooks, layouts, and copy text." },
            imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 highly detailed AI image prompts." },
            videoPrompts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 highly detailed AI video prompts." },
          },
          required: ["ideas", "imagePrompts", "videoPrompts"],
        },
      },
    });

    const thumbnailData = JSON.parse(thumbnailResponse.text || "{}");
    thumbnailData.generatedImages = {}; // Ready to receive active generations
    updateRun((r) => {
      r.thumbnail = thumbnailData;
      r.status = "seo_metadata";
      r.progress = 85;
    });

    // --- AGENT 6: SEO Agent ---
    console.log(`[Worker] Step 6: Formulating SEO Metadata and BG Music for ${company}`);
    const seoPrompt = `You are a YouTube search engine optimization specialist. Based on the script and thumbnail concepts, generate search optimization metadata.
You must output:
1. Exactly 10 diverse high-CTR title variations (titles) balancing search friendliness and clickability.
2. A complete, fully written SEO video description (description) with synopsis, social media calls, chapters outline, and keyword integration.
3. A set of 25 tags/keywords (tags).
4. A list of chapter timestamps (chapters) mapped to the script chapters.
5. Background music suggestions (bgMusic) detailing the musical genre and instruments for each chapter (Beginning: Soft Piano, Rise: Epic Orchestra, Fall: Dark Ambient, Comeback: Hopeful Cinematic).

Script:
${scriptData.longScript.slice(0, 5000)}`;

    const seoResponse = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: seoPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 high-CTR titles." },
            description: { type: Type.STRING, description: "Complete optimized video description." },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "25 search tags." },
            chapters: { type: Type.STRING, description: "Chapter timestamps mapping." },
            bgMusic: { type: Type.STRING, description: "BG Music recommendations mapped to chapters." },
          },
          required: ["titles", "description", "tags", "chapters", "bgMusic"],
        },
      },
    });

    const seoData = JSON.parse(seoResponse.text || "{}");
    updateRun((r) => {
      r.seo = seoData;
      r.status = "social_media";
      r.progress = 95;
    });

    // --- AGENT 7: Social Media Agent ---
    console.log(`[Worker] Step 7: Structuring promotional posts for ${company}`);
    const socialPrompt = `You are an expert multi-platform social media director. Based on the video content, write optimized promo posts for all channels.
You must output:
1. An Instagram caption (instagram) with visual formatting, bullet points, emojis, and hashtags.
2. A compelling thread (threads) of 3-5 items for Threads.
3. A catchy, high-engagement X (formerly Twitter) post (x) under 280 characters with hashtags.
4. An optimized Facebook post (facebook).
5. A high-quality professional LinkedIn article/post (linkedin) analyzing the business strategic pivot, leadership lessons, or market analysis.
6. A YouTube Community post (community) to build hype and tease the video.
7. An interactive quiz (quiz) containing 3 trivia questions about the story with options and answers to pin in the YouTube comments and drive comment velocity.

Script context:
${scriptData.longScript.slice(0, 4000)}`;

    const socialResponse = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: socialPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            instagram: { type: Type.STRING, description: "Instagram caption with emojis." },
            threads: { type: Type.STRING, description: "Compelling 3-5 post thread." },
            x: { type: Type.STRING, description: "Twitter post under 280 characters." },
            facebook: { type: Type.STRING, description: "Engaging Facebook post." },
            linkedin: { type: Type.STRING, description: "Professional LinkedIn business analysis." },
            community: { type: Type.STRING, description: "YouTube Community channel announcement." },
            quiz: { type: Type.STRING, description: "3 interactive trivia questions for comments." },
          },
          required: ["instagram", "threads", "x", "facebook", "linkedin", "community", "quiz"],
        },
      },
    });

    const socialData = JSON.parse(socialResponse.text || "{}");
    updateRun((r) => {
      r.social = socialData;
      r.status = "completed";
      r.progress = 100;
    });

    console.log(`[Worker] Pipeline completed successfully for ${company}!`);
  } catch (error: any) {
    console.error(`[Worker] Pipeline failed for run ${runId}:`, error);
    updateRun((r) => {
      r.status = "failed";
      r.error = error?.message || String(error);
    });
  } finally {
    activePipelines.delete(runId);
  }
}

// API Routes

// Get all content generation runs
app.get("/api/runs", (req: Request, res: Response) => {
  res.json(readHistory());
});

// Get a specific run
app.get("/api/runs/:id", (req: Request, res: Response) => {
  const history = readHistory();
  const run = history.find((r) => r.id === req.params.id);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(run);
});

// Start a new run
app.post("/api/runs", (req: Request, res: Response) => {
  const { companyName } = req.body;
  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    res.status(400).json({ error: "Company name is required." });
    return;
  }

  const newRun = {
    id: "run_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    companyName: companyName.trim(),
    status: "idle",
    progress: 0,
    createdAt: new Date().toISOString(),
  };

  const history = readHistory();
  history.unshift(newRun);
  writeHistory(history);

  // Trigger background job (non-blocking)
  runMultiAgentPipeline(newRun.id);

  res.status(201).json(newRun);
});

// Trigger real AI image generation using Gemini
app.post("/api/runs/:id/generate-image", async (req: Request, res: Response) => {
  const { promptIndex } = req.body;
  const { id } = req.params;

  const history = readHistory();
  const run = history.find((r) => r.id === id);
  if (!run) {
    res.status(404).json({ error: "Run not found." });
    return;
  }

  const prompt = run.thumbnail?.imagePrompts?.[promptIndex];
  if (!prompt) {
    res.status(400).json({ error: "Prompt index not found in run." });
    return;
  }

  try {
    console.log(`[Image Generator] Generating image for prompt index ${promptIndex}: "${prompt}"`);

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    let base64Image = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64Image = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!base64Image) {
      throw new Error("No image data returned from model.");
    }

    // Save back to JSON history
    const updatedHistory = readHistory();
    const targetRun = updatedHistory.find((r: any) => r.id === id);
    if (targetRun) {
      if (!targetRun.thumbnail.generatedImages) {
        targetRun.thumbnail.generatedImages = {};
      }
      targetRun.thumbnail.generatedImages[promptIndex] = base64Image;
      writeHistory(updatedHistory);
    }

    res.json({ success: true, imageUrl: base64Image });
  } catch (error: any) {
    console.error("[Image Generator] Error:", error);
    res.status(500).json({ error: error?.message || String(error) });
  }
});

// Save user uploaded custom image for a specific prompt
app.post("/api/runs/:id/upload-image", (req: Request, res: Response) => {
  const { promptIndex, base64Image } = req.body;
  const { id } = req.params;

  if (promptIndex === undefined || !base64Image) {
    res.status(400).json({ error: "Missing promptIndex or base64Image" });
    return;
  }

  const updatedHistory = readHistory();
  const targetRun = updatedHistory.find((r: any) => r.id === id);
  if (!targetRun) {
    res.status(404).json({ error: "Run not found." });
    return;
  }

  if (!targetRun.thumbnail) {
    targetRun.thumbnail = {};
  }
  if (!targetRun.thumbnail.generatedImages) {
    targetRun.thumbnail.generatedImages = {};
  }
  targetRun.thumbnail.generatedImages[promptIndex] = base64Image;
  writeHistory(updatedHistory);

  res.json({ success: true, imageUrl: base64Image });
});

// Clear image for a specific prompt
app.post("/api/runs/:id/clear-image", (req: Request, res: Response) => {
  const { promptIndex } = req.body;
  const { id } = req.params;

  if (promptIndex === undefined) {
    res.status(400).json({ error: "Missing promptIndex" });
    return;
  }

  const updatedHistory = readHistory();
  const targetRun = updatedHistory.find((r: any) => r.id === id);
  if (!targetRun) {
    res.status(404).json({ error: "Run not found." });
    return;
  }

  if (targetRun.thumbnail && targetRun.thumbnail.generatedImages) {
    delete targetRun.thumbnail.generatedImages[promptIndex];
    writeHistory(updatedHistory);
  }

  res.json({ success: true });
});

// Update/Edit any text content field in a run
app.post("/api/runs/:id/edit", (req: Request, res: Response) => {
  const { id } = req.params;
  const { section, field, value, subField } = req.body;

  const history = readHistory();
  const runIndex = history.findIndex((r) => r.id === id);
  if (runIndex === -1) {
    res.status(404).json({ error: "Run not found." });
    return;
  }

  const run = history[runIndex];
  try {
    if (!section) {
      // Direct field edit
      (run as any)[field] = value;
    } else if (subField) {
      // Deep nested edit
      (run as any)[section][field][subField] = value;
    } else {
      // Nested edit
      (run as any)[section][field] = value;
    }

    writeHistory(history);
    res.json({ success: true, run });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to edit content field." });
  }
});

// Delete a run
app.delete("/api/runs/:id", (req: Request, res: Response) => {
  const history = readHistory();
  const filtered = history.filter((r) => r.id !== req.params.id);
  writeHistory(filtered);
  res.json({ success: true });
});

// Batch automation queue creation
app.post("/api/runs/queue-multiple", (req: Request, res: Response) => {
  const { companies } = req.body;
  if (!companies || !Array.isArray(companies)) {
    res.status(400).json({ error: "An array of company names is required." });
    return;
  }

  const createdRuns = [];
  const history = readHistory();

  for (const company of companies) {
    if (typeof company === "string" && company.trim()) {
      const newRun = {
        id: "run_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        companyName: company.trim(),
        status: "idle",
        progress: 0,
        createdAt: new Date().toISOString(),
      };
      history.unshift(newRun);
      createdRuns.push(newRun);
    }
  }

  writeHistory(history);

  // Trigger background jobs in series or immediately
  createdRuns.forEach((run) => {
    runMultiAgentPipeline(run.id);
  });

  res.status(201).json(createdRuns);
});

// Converts raw 16-bit PCM audio stream to a standard WAV format with custom sample rate
function pcmToWav(base64Pcm: string, sampleRate: number = 24000): Buffer {
  const pcmBuffer = Buffer.from(base64Pcm, "base64");
  
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // RIFF container structure
  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Helper for premium single-speaker voice synthesis using gemini-3.1-flash-tts-preview
async function getGeminiTTSBuffer(text: string, voiceName: string, retries = 3, initialDelayMs = 1500): Promise<Buffer> {
  const cleanedText = text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
  if (!cleanedText) {
    throw new Error("Text parameter is empty.");
  }

  let delay = initialDelayMs;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanedText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error(`Gemini TTS returned no audio data for voice: ${voiceName}`);
      }

      return pcmToWav(base64Audio, 24000);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || err?.status === 429;

      if (i === retries) {
        throw err;
      }

      console.warn(`[Gemini TTS Retry] Attempt ${i + 1} failed. Rate limit? ${isRateLimit}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error("Synthesis failed after all retries.");
}

// Helper for basic Google Translate fallback voice
async function getTTSBuffer(text: string): Promise<Buffer> {
  const cleanedText = text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
  const sentences = cleanedText.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [cleanedText];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > 180) {
      const subparts = trimmed.split(/[,;:]/);
      for (const part of subparts) {
        const partTrimmed = part.trim();
        if ((currentChunk + " " + partTrimmed).trim().length > 180) {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = partTrimmed;
        } else {
          currentChunk = currentChunk ? currentChunk + " " + partTrimmed : partTrimmed;
        }
      }
    } else {
      if ((currentChunk + " " + trimmed).trim().length > 180) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = trimmed;
      } else {
        currentChunk = currentChunk ? currentChunk + " " + trimmed : trimmed;
      }
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    if (!chunk) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) {
      throw new Error(`TTS fetch failed for chunk: ${chunk}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    buffers.push(Buffer.from(arrayBuffer));
  }

  return Buffer.concat(buffers);
}

// Server-side Text-To-Speech proxy endpoint supporting Premium & Fallback voices with in-memory caching
const ttsCache = new Map<string, { buffer: Buffer; contentType: string }>();

app.get("/api/tts", async (req: Request, res: Response) => {
  const text = req.query.text as string;
  const voice = (req.query.voice as string) || "Zephyr";

  if (!text) {
    res.status(400).json({ error: "Missing text parameter" });
    return;
  }

  const cacheKey = `${voice}:${text}`;
  if (ttsCache.has(cacheKey)) {
    const cached = ttsCache.get(cacheKey)!;
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("X-Cache", "HIT");
    res.send(cached.buffer);
    return;
  }

  // Fallback voice selection
  if (voice === "GoogleTranslate") {
    try {
      const buffer = await getTTSBuffer(text);
      ttsCache.set(cacheKey, { buffer, contentType: "audio/mpeg" });
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(buffer);
      return;
    } catch (err: any) {
      console.error("Translate Fallback Error:", err);
      res.status(500).json({ error: "Translation synthesis failed" });
      return;
    }
  }

  // Standard/Premium voice selection with automatic fallback on error
  try {
    const buffer = await getGeminiTTSBuffer(text, voice);
    ttsCache.set(cacheKey, { buffer, contentType: "audio/wav" });
    res.setHeader("Content-Type", "audio/wav");
    res.send(buffer);
  } catch (err: any) {
    console.warn(`Premium voice (${voice}) failed, falling back to Translate TTS:`, err.message || err);
    try {
      const buffer = await getTTSBuffer(text);
      ttsCache.set(cacheKey, { buffer, contentType: "audio/mpeg" });
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (fallbackErr: any) {
      console.error("All TTS options failed:", fallbackErr);
      res.status(500).json({ error: "TTS synthesis completely failed." });
    }
  }
});

// Vite static assets serving & SPA handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
