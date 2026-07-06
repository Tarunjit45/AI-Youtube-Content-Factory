import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Film, 
  Volume2, 
  VolumeX, 
  Download, 
  Sparkles, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Upload,
  Camera,
  Trash2,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Scissors,
  Copy,
  Plus,
  Music
} from "lucide-react";
import { ContentFactoryRun } from "../types";

interface VideoCompilerProps {
  run: ContentFactoryRun;
}

interface Scene {
  id: number;
  title: string;
  imageIndex: number;
  imagePrompt: string;
  originalText: string;
  narrationText: string;
  duration: number; // in seconds
  audioDisabled?: boolean;
}

export const VideoCompiler: React.FC<VideoCompilerProps> = ({ run }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(-1); // -1 means not rendering
  const [renderStatus, setRenderStatus] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  
  // Local state for user-uploaded custom images for each scene
  const [uploadedImages, setUploadedImages] = useState<Record<number, string>>({});
  const [narratorVoice, setNarratorVoice] = useState<string>("Zephyr");
  const [pacingPreset, setPacingPreset] = useState<"shorts" | "medium" | "long" | "deep" | "mega">("medium");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTimeoutRef = useRef<any>(null);
  const activeSegmentTextRef = useRef<string>("");
  const prefetchCacheRef = useRef<Map<string, string>>(new Map());
  const measuredScenesRef = useRef<Set<string>>(new Set());
  const lastVoiceRef = useRef<string>(narratorVoice);

  // Parse voiceover into coherent chapters/scenes matching the selected pacing mode
  useEffect(() => {
    if (!run) return;

    const voiceOverText = run.script?.voiceOver || run.script?.longScript || "";
    const cleaned = voiceOverText.replace(/\[[^\]]+\]/g, "").trim();

    // Determine configuration properties based on selected preset
    let sceneCount = 5;
    let wordsPerSecond = 2.1;
    let minDuration = 5;
    let maxDuration = 15;
    let padSeconds = 1;

    switch (pacingPreset) {
      case "shorts":
        sceneCount = 5;
        wordsPerSecond = 2.4;
        minDuration = 4;
        maxDuration = 11; // Ensure total stays under 55-60s
        padSeconds = 1;
        break;
      case "medium":
        sceneCount = 8;
        wordsPerSecond = 1.9;
        minDuration = 6;
        maxDuration = 35;
        padSeconds = 3;
        break;
      case "long":
        sceneCount = 12;
        wordsPerSecond = 1.6;
        minDuration = 8;
        maxDuration = 50;
        padSeconds = 4;
        break;
      case "deep":
        sceneCount = 16;
        wordsPerSecond = 1.3;
        minDuration = 10;
        maxDuration = 70;
        padSeconds = 5;
        break;
      case "mega":
        sceneCount = 24;
        wordsPerSecond = 1.0;
        minDuration = 12;
        maxDuration = 110;
        padSeconds = 7;
        break;
    }

    // Dynamic chunking algorithm to distribute text into exactly N scenes
    const getChunks = (text: string, count: number): string[] => {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) return Array(count).fill("");

      const sentences = text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 2) || [];

      if (sentences.length >= count) {
        const chunks: string[] = [];
        const size = Math.floor(sentences.length / count);
        for (let i = 0; i < count; i++) {
          const start = i * size;
          const end = i === count - 1 ? sentences.length : (i + 1) * size;
          chunks.push(sentences.slice(start, end).join(" "));
        }
        return chunks;
      } else {
        const chunks: string[] = [];
        const size = Math.max(1, Math.floor(words.length / count));
        for (let i = 0; i < count; i++) {
          const start = i * size;
          const end = i === count - 1 ? words.length : (i + 1) * size;
          chunks.push(words.slice(start, end).join(" "));
        }
        return chunks;
      }
    };

    const narrationChunks = getChunks(cleaned, sceneCount);

    const imagePrompts = run.thumbnail?.imagePrompts || [
      "Dynamic establishing shot of corporate headquarters",
      "Stunning historic technology visual",
      "Dramatic corporate crisis or pivot point",
      "Intense falling action or market crash visual",
      "Inspiring futuristic innovation scene"
    ];

    const computedScenes: Scene[] = [];

    for (let i = 0; i < sceneCount; i++) {
      const narrationText = narrationChunks[i]?.trim() || `Deep analysis of ${run.companyName}. Chapter ${i + 1} of this historical retrospective.`;
      
      // Calculate realistic reading duration based on words-per-second and padding
      const wordCount = narrationText.split(/\s+/).filter(w => w.length > 0).length;
      const computedDuration = Math.max(minDuration, Math.min(maxDuration, Math.round(wordCount / wordsPerSecond) + padSeconds));

      computedScenes.push({
        id: i,
        title: `Chapter ${i + 1}: ${i === 0 ? "The Genesis" : i === sceneCount - 1 ? "The Ultimate Legacy" : "Strategic Evolution"}`,
        imageIndex: i % imagePrompts.length,
        imagePrompt: imagePrompts[i % imagePrompts.length] || "",
        originalText: narrationText,
        narrationText,
        duration: computedDuration
      });
    }

    setScenes(computedScenes);
    setActiveSceneIndex(0);
  }, [run, pacingPreset]);

  // Helper to load audio metadata and return its duration
  const getAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const tempAudio = new Audio(url);
      tempAudio.addEventListener("loadedmetadata", () => {
        resolve(tempAudio.duration);
      });
      tempAudio.addEventListener("error", () => {
        resolve(0);
      });
      // Fallback timeout in case loading fails
      setTimeout(() => resolve(0), 4000);
    });
  };

  // Helper to pre-buffer voice narration into local browser RAM as a blob Object URL
  const preloadText = async (text: string, voice: string, sceneId?: number) => {
    const cleanedText = text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
    if (!cleanedText) return "";

    const cacheKey = `${voice}:${cleanedText}`;
    let objectUrl = "";
    if (prefetchCacheRef.current.has(cacheKey)) {
      objectUrl = prefetchCacheRef.current.get(cacheKey)!;
    } else {
      try {
        const url = `/api/tts?text=${encodeURIComponent(cleanedText)}&voice=${voice}`;
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          prefetchCacheRef.current.set(cacheKey, objectUrl);
        }
      } catch (err) {
        console.warn("Preload failed for text:", cleanedText.slice(0, 20), err);
      }
    }

    // If sceneId is provided and we have the objectUrl, let's measure its exact duration
    // and update the scene duration state so it perfectly shrinks/grows to match!
    if (sceneId !== undefined && objectUrl) {
      const measureKey = `${voice}:${sceneId}`;
      if (!measuredScenesRef.current.has(measureKey)) {
        measuredScenesRef.current.add(measureKey);
        try {
          const audioDuration = await getAudioDuration(objectUrl);
          if (audioDuration > 0) {
            // Match exactly with a small 1s padding to avoid cutting off subtitles
            const exactDuration = Math.max(2, Math.ceil(audioDuration + 0.5));
            setScenes((prevScenes) =>
              prevScenes.map((s) => {
                if (s.id === sceneId) {
                  return { ...s, duration: exactDuration };
                }
                return s;
              })
            );
          }
        } catch (err) {
          console.warn("Failed to measure audio duration:", err);
        }
      }
    }

    return objectUrl;
  };

  // Background audio stream prefetching engine for gapless playback
  // Optimized to only prefetch active/adjacent scenes to avoid exhausting Gemini free tier rate limits (429 prevention)
  useEffect(() => {
    if (scenes.length === 0) return;
    const voice = narratorVoice;

    // Reset the measured scenes set and cache when the narrator voice selection changes,
    // so the timeline scene durations perfectly shrink/grow to match the new voice's duration.
    if (lastVoiceRef.current !== voice) {
      lastVoiceRef.current = voice;
      measuredScenesRef.current.clear();
    }

    const prefetchAll = async () => {
      // 1. Prefetch the active scene and its segments
      const activeScene = scenes[activeSceneIndex];
      if (activeScene && !activeScene.audioDisabled && activeScene.narrationText) {
        // Preload active scene full text for rendering/measuring
        await preloadText(activeScene.narrationText, voice, activeScene.id).catch(() => {});

        // Preload active scene's sub-segments for word-by-word player highlights
        const activeSegments = parseNarrationSegments(activeScene.narrationText);
        for (const segment of activeSegments) {
          if (segment.text.trim()) {
            await preloadText(segment.text, voice).catch(() => {});
          }
        }
      }

      // 2. Prefetch the next adjacent scene in advance for a gapless transition
      const nextSceneIdx = activeSceneIndex + 1;
      if (nextSceneIdx < scenes.length) {
        const nextScene = scenes[nextSceneIdx];
        if (nextScene && !nextScene.audioDisabled && nextScene.narrationText) {
          await preloadText(nextScene.narrationText, voice, nextScene.id).catch(() => {});
        }
      }
    };

    prefetchAll().catch((err) => console.warn("Background prefetch failed:", err));
  }, [scenes, narratorVoice, activeSceneIndex]);

  // Helper to parse voice-over tags like [Slow], [Energetic], [Pause]
  const parseNarrationSegments = (text: string) => {
    const regex = /(\[[^\]]+\])/g;
    const parts = text.split(regex);
    
    const segments: { text: string; rate: number; pauseBefore: number }[] = [];
    let currentRate = 1.0;
    let currentPause = 0;

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const tag = trimmed.slice(1, -1).toLowerCase();
        if (tag === "pause") {
          currentPause += 250; // tighten pause from 1.2s to 250ms for low gap
        } else if (tag === "slow" || tag === "dramatic" || tag === "serious" || tag === "sad") {
          currentRate = 0.82; // dramatic slow pacing
        } else if (tag === "energetic" || tag === "excited" || tag === "urgent" || tag === "fast") {
          currentRate = 1.15; // fast-paced energetic
        } else if (tag === "normal" || tag === "calm" || tag === "neutral") {
          currentRate = 1.0; // standard pacing
        }
      } else {
        segments.push({
          text: trimmed,
          rate: currentRate,
          pauseBefore: currentPause
        });
        currentPause = 0; // reset
      }
    }

    if (segments.length === 0 && text.trim()) {
      segments.push({
        text: text.trim().replace(/\[[^\]]+\]/g, ""),
        rate: 1.0,
        pauseBefore: 0
      });
    }

    return segments;
  };

  // Handle narration speech synthesis using server-side TTS proxy with client-side blob caching
  const speakScene = (text: string, onEnd: () => void) => {
    if (!audioRef.current) return;

    const currentScene = scenes[activeSceneIndex];
    if (isMuted || currentScene?.audioDisabled || !text.trim()) {
      // Simulate speaking duration via timeout if muted, empty, or audio is disabled
      const sceneDuration = currentScene?.duration * 1000 || 8000;
      playTimeoutRef.current = setTimeout(() => {
        onEnd();
      }, sceneDuration);
      return;
    }

    const segments = parseNarrationSegments(text);
    let segmentIndex = 0;

    const playNextSegment = () => {
      // If playback has been paused or stopped, do not proceed
      if (playTimeoutRef.current && segmentIndex === 0) {
        // We are starting, clear any previous timeouts
      }

      if (segmentIndex >= segments.length) {
        activeSegmentTextRef.current = "";
        onEnd();
        return;
      }

      const segment = segments[segmentIndex];
      const audio = audioRef.current;
      if (!audio) return;

      const triggerAudio = () => {
        // Set the active subtitle text only when audio is triggered
        activeSegmentTextRef.current = segment.text;

        const cleanedText = segment.text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
        const cacheKey = `${narratorVoice}:${cleanedText}`;
        const cachedUrl = prefetchCacheRef.current.get(cacheKey);

        if (cachedUrl) {
          audio.src = cachedUrl;
        } else {
          audio.src = `/api/tts?text=${encodeURIComponent(segment.text)}&voice=${narratorVoice}`;
        }
        audio.load();

        // Apply pacing/emotion speed
        audio.playbackRate = segment.rate;
        audio.defaultPlaybackRate = segment.rate;

        audio.onended = () => {
          activeSegmentTextRef.current = ""; // clear subtitle text immediately
          segmentIndex++;
          playNextSegment();
        };

        audio.onerror = (err) => {
          console.warn("TTS Audio segment error, skipping:", err);
          activeSegmentTextRef.current = "";
          segmentIndex++;
          playNextSegment();
        };

        audio.play().catch((err) => {
          console.warn("Audio play interrupted:", err);
          activeSegmentTextRef.current = "";
          segmentIndex++;
          playNextSegment();
        });
      };

      if (segment.pauseBefore > 0) {
        // Clear active subtitle during the pause
        activeSegmentTextRef.current = "";
        playTimeoutRef.current = setTimeout(() => {
          triggerAudio();
        }, segment.pauseBefore);
      } else {
        triggerAudio();
      }
    };

    playNextSegment();
  };

  // stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
  };

  // Play next scene automatically
  const handleSceneEnd = () => {
    setActiveSceneIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex < scenes.length) {
        return nextIndex;
      } else {
        setIsPlaying(false);
        stopPlayback();
        return 0; // wrap back
      }
    });
  };

  // Trigger speech when scene shifts or playback starts
  useEffect(() => {
    if (isPlaying && scenes.length > 0) {
      // Lazy load/connect Audio elements to context for standard preview
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      if (audioRef.current && !mediaSourceRef.current) {
        try {
          mediaSourceRef.current = ctx.createMediaElementSource(audioRef.current);
          mediaSourceRef.current.connect(ctx.destination);
        } catch (e) {
          console.warn("Failed to attach media element source:", e);
        }
      }

      const activeScene = scenes[activeSceneIndex];
      speakScene(activeScene.narrationText, handleSceneEnd);
    }
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    };
  }, [isPlaying, activeSceneIndex, scenes, narratorVoice]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      setIsPlaying(true);
    }
  };

  // Handle tab mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      stopPlayback();
    } else {
      setIsPlaying(false); // restart clean
    }
  };

  // Handle user uploading custom local image for a specific scene
  const handleImageUpload = (sceneId: number, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setUploadedImages(prev => ({
          ...prev,
          [sceneId]: dataUrl
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove uploaded custom image
  const removeUploadedImage = (sceneId: number) => {
    setUploadedImages(prev => {
      const updated = { ...prev };
      delete updated[sceneId];
      return updated;
    });
  };

  // Video Editor: Move segment up or down in timeline
  const moveScene = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === scenes.length - 1) return;
    stopPlayback();
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...scenes];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setScenes(updated);
    setActiveSceneIndex(targetIndex);
  };

  // Video Editor: Split current segment in half (Cut Text and Duration)
  const splitScene = (index: number) => {
    stopPlayback();
    const scene = scenes[index];
    const text = scene.narrationText;
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= 1) {
      alert("Narration text is too short to split/cut!");
      return;
    }

    const midpoint = Math.ceil(words.length / 2);
    const part1 = words.slice(0, midpoint).join(" ");
    const part2 = words.slice(midpoint).join(" ");

    const duration1 = Math.max(2, Math.floor(scene.duration / 2));
    const duration2 = Math.max(2, scene.duration - duration1);

    const newId = Math.max(0, ...scenes.map((s) => s.id)) + 1;

    const newScene: Scene = {
      id: newId,
      title: `${scene.title} (Part 2)`,
      imageIndex: scene.imageIndex,
      imagePrompt: scene.imagePrompt,
      originalText: part2,
      narrationText: part2,
      duration: duration2,
      audioDisabled: scene.audioDisabled,
    };

    const updated = [...scenes];
    updated[index] = {
      ...scene,
      title: `${scene.title} (Part 1)`,
      narrationText: part1,
      duration: duration1,
    };
    updated.splice(index + 1, 0, newScene);

    // Transfer uploaded image if any
    const uploadedImgUrl = uploadedImages[scene.id];
    if (uploadedImgUrl) {
      setUploadedImages((prev) => ({
        ...prev,
        [newId]: uploadedImgUrl,
      }));
    }

    setScenes(updated);
    setActiveSceneIndex(index);
  };

  // Video Editor: Merge active segment with next consecutive segment
  const mergeSceneWithNext = (index: number) => {
    if (index >= scenes.length - 1) return;
    stopPlayback();
    const current = scenes[index];
    const next = scenes[index + 1];

    const mergedText = `${current.narrationText.trim()} ${next.narrationText.trim()}`.trim();
    const mergedDuration = current.duration + next.duration;

    const updated = [...scenes];
    updated[index] = {
      ...current,
      narrationText: mergedText,
      duration: mergedDuration,
      audioDisabled: current.audioDisabled && next.audioDisabled,
    };
    updated.splice(index + 1, 1);

    setScenes(updated);
    setActiveSceneIndex(index);
  };

  // Video Editor: Delete a full segment (Audio & Video track parts)
  const deleteScene = (index: number) => {
    if (scenes.length <= 1) {
      alert("Your video timeline must have at least one segment!");
      return;
    }
    stopPlayback();
    const updated = [...scenes];
    updated.splice(index, 1);
    setScenes(updated);
    
    if (activeSceneIndex >= updated.length) {
      setActiveSceneIndex(updated.length - 1);
    } else if (activeSceneIndex === index) {
      setActiveSceneIndex(Math.max(0, index - 1));
    }
  };

  // Video Editor: Duplicate current active scene segment
  const duplicateScene = (index: number) => {
    stopPlayback();
    const scene = scenes[index];
    const newId = Math.max(0, ...scenes.map((s) => s.id)) + 1;
    
    const duplicated: Scene = {
      ...scene,
      id: newId,
      title: `${scene.title} (Copy)`,
    };

    const updated = [...scenes];
    updated.splice(index + 1, 0, duplicated);

    const uploadedImgUrl = uploadedImages[scene.id];
    if (uploadedImgUrl) {
      setUploadedImages((prev) => ({
        ...prev,
        [newId]: uploadedImgUrl,
      }));
    }

    setScenes(updated);
    setActiveSceneIndex(index + 1);
  };

  // Video Editor: Append a brand new blank scene segment
  const addCustomScene = () => {
    stopPlayback();
    const newId = Math.max(0, ...scenes.map((s) => s.id)) + 1;
    const newScene: Scene = {
      id: newId,
      title: `Chapter ${scenes.length + 1}: Custom Clip`,
      imageIndex: scenes.length % 5,
      imagePrompt: "Custom establishing landscape visual",
      originalText: "Write narrative text for this custom segment...",
      narrationText: "Write narrative text for this custom segment...",
      duration: 6,
    };
    setScenes([...scenes, newScene]);
    setActiveSceneIndex(scenes.length);
  };

  // Video Editor: Increment/Decrement duration of segment
  const adjustDuration = (index: number, change: number) => {
    setScenes((prev) =>
      prev.map((s, idx) => {
        if (idx === index) {
          return {
            ...s,
            duration: Math.max(2, s.duration + change),
          };
        }
        return s;
      })
    );
  };

  // Video Editor: Toggle mute/disable audio narration part of segment
  const toggleSceneAudio = (index: number) => {
    stopPlayback();
    setScenes((prev) =>
      prev.map((s, idx) => {
        if (idx === index) {
          return {
            ...s,
            audioDisabled: !s.audioDisabled,
          };
        }
        return s;
      })
    );
  };

  // Dynamic canvas drawing loop (Simulating a real live video stream)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCount = 0;
    let localFrameId: number;

    const render = () => {
      if (scenes.length === 0) return;

      const activeScene = scenes[activeSceneIndex];
      
      // Determine image to render (user-uploaded custom image takes top priority, then generated, then fallback)
      const uploadedImgUrl = uploadedImages[activeScene.id];
      const generatedImgUrl = run.thumbnail?.generatedImages?.[activeScene.imageIndex];
      const imgUrl = uploadedImgUrl || generatedImgUrl;

      // Draw background: Pure pitch-black "#000000" as requested
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ken Burns scale calculation
      frameCount++;
      const zoomProgress = (frameCount % 600) / 600; // loop slowly
      const scale = 1.0 + zoomProgress * 0.12;

      // Calculate total video duration dynamically to handle aspect toggle
      const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
      const isShorts = totalDuration < 60;

      // Draw the core image frame
      if (imgUrl) {
        const img = new Image();
        img.src = imgUrl;
        img.crossOrigin = "anonymous";
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        
        try {
          // Draw image with proper cover aspect ratio to prevent stretching
          const imgRatio = img.width / img.height;
          const canvasRatio = canvas.width / canvas.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          let offsetX = 0;
          let offsetY = 0;

          if (imgRatio > canvasRatio) {
            drawWidth = canvas.height * imgRatio;
            offsetX = (canvas.width - drawWidth) / 2;
          } else {
            drawHeight = canvas.width / imgRatio;
            offsetY = (canvas.height - drawHeight) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        } catch {
          // Fallback if image isn't loaded completely
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      } else {
        // Sophisticated fallback white animations on pure black background as requested
        ctx.save();
        
        // Draw sophisticated white constellation dust
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (let i = 0; i < 35; i++) {
          const px = (i * 47 + frameCount * 0.3) % canvas.width;
          const py = (i * 31 + Math.sin(frameCount * 0.01 + i) * 12) % canvas.height;
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw elegant white rotating compass rings in the background
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.setLineDash([5, 15]);
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 130, frameCount * 0.003, frameCount * 0.003 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Minimalist high-contrast pure white Voice Waveform Visualizer
        const waveCenterY = canvas.height / 2;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 60; x < canvas.width - 60; x += 3) {
          const distanceToCenter = Math.abs(x - canvas.width / 2);
          const envelope = Math.max(0, 1 - distanceToCenter / (canvas.width / 2.3));
          
          // Generate a complex beautiful interference pattern of multiple sine waves
          const wave1 = Math.sin(x * 0.04 - frameCount * 0.15) * 25;
          const wave2 = Math.cos(x * 0.08 + frameCount * 0.1) * 12;
          const wave3 = Math.sin(x * 0.015 + frameCount * 0.05) * 8;
          const activeAmp = isPlaying ? 1.0 : 0.08;
          
          const y = waveCenterY + (wave1 + wave2 + wave3) * envelope * activeAmp;
          if (x === 60) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Sleek voice pulse rings
        if (isPlaying) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, 40 + (frameCount % 60) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.restore();
      }

      // Stylized cinematic vignette overlay
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height / 3,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.5
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Chapter Label top bar (aligned perfectly for 16:9 or 9:16)
      const labelWidth = 190;
      const labelX = isShorts ? (canvas.width - labelWidth) / 2 : 16;
      const labelY = 16;
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(labelX, labelY, labelWidth, 26);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.strokeRect(labelX, labelY, labelWidth, 26);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(activeScene.title.toUpperCase(), labelX + labelWidth / 2, labelY + 16);

      // Subtitles overlays (Big bold captions centered bottom with word-by-word active highlighting)
      const isCompiling = renderProgress > 0 && renderProgress < 100;
      const currentSpeech = isPlaying ? activeSegmentTextRef.current : activeScene.narrationText;
      const words = currentSpeech ? currentSpeech.split(/\s+/).filter(w => w.length > 0) : [];
      const totalWords = words.length;

      let showCaption = false;
      let activeWordCount = 0;

      if (isPlaying) {
        // Preview play: show caption ONLY when there is active text and audio is playing (not paused/ended/waiting)
        const isAudioActive = audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0 && !audioRef.current.ended;
        if (currentSpeech && isAudioActive && audioRef.current && audioRef.current.duration > 0) {
          showCaption = true;
          const progress = Math.min(0.99, audioRef.current.currentTime / audioRef.current.duration);
          activeWordCount = Math.floor(progress * totalWords);
        }
      } else if (isCompiling) {
        // Compilation: show caption ONLY when audio is actively playing for perfect synchronization
        const isExporting = audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0 && !audioRef.current.ended;
        if (isExporting && audioRef.current && audioRef.current.duration > 0) {
          showCaption = true;
          const progress = Math.min(0.99, audioRef.current.currentTime / audioRef.current.duration);
          activeWordCount = Math.floor(progress * totalWords);
        }
      } else {
        // Completely idle: show caption as preview animating with frameCount
        showCaption = totalWords > 0;
        const speedFactor = totalWords / (activeScene.duration || 8);
        activeWordCount = Math.min(totalWords - 1, Math.floor((frameCount / 24) * speedFactor));
      }

      if (showCaption && words.length > 0) {
        // Group words into lines of 6 words
        const lineWordsCount = 6;
        const startWordIdx = Math.max(0, Math.min(totalWords - lineWordsCount, Math.floor(activeWordCount / lineWordsCount) * lineWordsCount));
        const displayedWords = words.slice(startWordIdx, startWordIdx + lineWordsCount);
        const highlightLocalIdx = activeWordCount - startWordIdx;

        // Draw stylized captions background shadow bar
        const barWidth = canvas.width - 40;
        const barHeight = isShorts ? 64 : 44;
        const barY = isShorts ? canvas.height - 210 : canvas.height - 75;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.beginPath();
        ctx.roundRect(20, barY, barWidth, barHeight, 8);
        ctx.fill();

        // Render the words
        ctx.font = isShorts ? "bold 20px Inter, sans-serif" : "bold 18px Inter, sans-serif";
        ctx.textAlign = "center";
        
        const textX = canvas.width / 2;
        const textY = isShorts ? canvas.height - 172 : canvas.height - 48;

        const fullLineText = displayedWords.join(" ");

        // Draw outline
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
        ctx.strokeText(fullLineText, textX, textY);

        // Draw standard text in clean white
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fullLineText, textX, textY);

        // Draw gold highlight on current active word
        const activeWord = displayedWords[highlightLocalIdx];
        if (activeWord) {
          const prefixWords = displayedWords.slice(0, highlightLocalIdx);
          const prefixText = prefixWords.join(" ");
          const prefixWidth = prefixText ? ctx.measureText(prefixText + " ").width : 0;
          const totalLineWidth = ctx.measureText(fullLineText).width;
          const activeWordWidth = ctx.measureText(activeWord).width;

          // Exact coordinates
          const activeWordX = textX - (totalLineWidth / 2) + prefixWidth + (activeWordWidth / 2);

          ctx.strokeText(activeWord, activeWordX, textY);
          ctx.fillStyle = "#facc15"; // Gold Highlight
          ctx.fillText(activeWord, activeWordX, textY);
        }
      }

      // Draw beautiful pure white voice frequency visualizer bars in the top corner!
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      for (let i = 0; i < 20; i++) {
        const waveHeight = isPlaying ? Math.abs(Math.sin(frameCount * 0.2 + i * 0.6)) * 16 + 2 : 2;
        ctx.fillRect(canvas.width - 100 + i * 4, 24, 2.5, waveHeight);
      }

      localFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(localFrameId);
    };
  }, [scenes, activeSceneIndex, isPlaying, uploadedImages, narratorVoice, pacingPreset]);

  // Handle client-side recording and rendering compilation loop (0 BACKGROUND MUSIC)
  const handleExportVideo = async () => {
    if (scenes.length === 0) return;
    stopPlayback();

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setRenderProgress(0);
      setRenderStatus("Initializing pure video compilation engine...");

      // Ensure AudioContext is up and running
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Capture standard 24fps media stream from canvas
      const canvasStream = canvas.captureStream(24);

      // Set up Web Audio destination capture for pure high-quality voiceover
      const destNode = ctx.createMediaStreamDestination();

      // Configure TTS audio element connections to capture pure voiceover (NO BACKGROUND MUSIC!)
      if (audioRef.current) {
        if (!mediaSourceRef.current) {
          mediaSourceRef.current = ctx.createMediaElementSource(audioRef.current);
        }
        mediaSourceRef.current.disconnect(); // clear old connections
        mediaSourceRef.current.connect(destNode); // Record voice directly to output
        mediaSourceRef.current.connect(ctx.destination); // Output to speaker as well
      }

      // Combine video track and pure voice audio track
      const combinedStream = new MediaStream();
      combinedStream.addTrack(canvasStream.getVideoTracks()[0]);
      if (destNode.stream.getAudioTracks().length > 0) {
        combinedStream.addTrack(destNode.stream.getAudioTracks()[0]);
      }

      // Initialize media recorder
      const supportedTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
      let selectedType = "";
      for (const mime of supportedTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedType = mime;
          break;
        }
      }

      const recordedChunks: Blob[] = [];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedType,
        videoBitsPerSecond: 2500000, // High definition 2.5 Mbps
        audioBitsPerSecond: 128000  // Clear audio 128kbps
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Create full downloadable output blob
        const videoBlob = new Blob(recordedChunks, { type: selectedType || "video/webm" });
        const url = URL.createObjectURL(videoBlob);
        setDownloadUrl(url);
        
        // Auto-download file
        const a = document.createElement("a");
        a.href = url;
        const fileExt = selectedType.includes("mp4") ? "mp4" : "webm";
        a.download = `${run.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_ready_full_documentary.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setRenderProgress(100);
        setRenderStatus("Video compilation complete! File downloaded.");
      };

      // Start recording
      recorder.start();

      let currentSceneIdx = 0;

      // Play next render scene when triggered (Perfect narration and scene synchronization)
      const playNextRenderScene = () => {
        if (currentSceneIdx >= scenes.length) {
          // All scenes merged successfully! Finalize recording.
          recorder.stop();
          return;
        }

        const scene = scenes[currentSceneIdx];
        setActiveSceneIndex(currentSceneIdx);

        const pct = Math.round((currentSceneIdx / scenes.length) * 100);
        setRenderProgress(pct);
        setRenderStatus(`Merging Scene ${currentSceneIdx + 1}: ${scene.title} (${pct}% complete)...`);

        if (scene.audioDisabled || !scene.narrationText.trim()) {
          // Pure silent segment: wait exactly for the scene duration in seconds
          setTimeout(() => {
            currentSceneIdx++;
            playNextRenderScene();
          }, scene.duration * 1000);
          return;
        }

        if (audioRef.current) {
          const cleanedText = scene.narrationText.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
          const cacheKey = `${narratorVoice}:${cleanedText}`;
          const cachedUrl = prefetchCacheRef.current.get(cacheKey);

          if (cachedUrl) {
            audioRef.current.src = cachedUrl;
          } else {
            audioRef.current.src = `/api/tts?text=${encodeURIComponent(scene.narrationText)}&voice=${narratorVoice}`;
          }
          audioRef.current.load();

          audioRef.current.onended = () => {
            // Tight transition delay between chapters for perfect seamless voice flow
            setTimeout(() => {
              currentSceneIdx++;
              playNextRenderScene();
            }, 10);
          };

          audioRef.current.onerror = (e) => {
            console.error("Audio failed to load, skipping scene in 5s:", e);
            setTimeout(() => {
              currentSceneIdx++;
              playNextRenderScene();
            }, 5000);
          };

          audioRef.current.play().catch(err => {
            console.warn("Audio play interrupted on render, skipping in 5s:", err);
            setTimeout(() => {
              currentSceneIdx++;
              playNextRenderScene();
            }, 5000);
          });
        } else {
          // Ref fallback
          setTimeout(() => {
            currentSceneIdx++;
            playNextRenderScene();
          }, 6000);
        }
      };

      // Start compilation loop
      playNextRenderScene();

    } catch (err) {
      console.error("Renderer failed:", err);
      alert("Browser failed to merge media tracks. Attempting standard WebM render.");
      setRenderProgress(-1);
    }
  };

  // Calculate total video properties for dynamic layouts and UI status
  const totalLengthSec = scenes.reduce((acc, s) => acc + s.duration, 0);
  const isShorts = totalLengthSec < 60;
  const formattedLength = `${Math.floor(totalLengthSec / 60)}:${String(totalLengthSec % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Hidden audio element for TTS streaming */}
      <audio ref={audioRef} crossOrigin="anonymous" className="hidden" />

      {/* Intro Header */}
      <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 font-mono">
              <Film className="w-5 h-5 text-emerald-400" /> FULL VIDEO COMPILER STUDIO
            </h2>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-full">
              TOTAL LENGTH: {formattedLength}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Merge generated or uploaded custom frames, overlays, and perfect subtitles into a complete video with **0 background music**.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Format & Target Video Duration Pacing Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">Format & Pacing:</span>
            <select
              value={pacingPreset}
              onChange={(e) => setPacingPreset(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer transition-all"
            >
              <option value="shorts">YouTube Shorts (Under 60s) [9:16 Portrait]</option>
              <option value="medium">Medium Documentary (1.5 - 3 min) [16:9 Landscape]</option>
              <option value="long">Long-Form Documentary (3 - 5 min) [16:9 Landscape]</option>
              <option value="deep">Extended Saga (5 - 10 min) [16:9 Landscape]</option>
              <option value="mega">Mega Deep-Dive (10+ min) [16:9 Landscape]</option>
            </select>
          </div>

          {/* Narrator Voice Picker */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">Narrator Voice:</span>
            <select
              value={narratorVoice}
              onChange={(e) => {
                stopPlayback();
                setNarratorVoice(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer transition-all"
            >
              <option value="Zephyr">Female: Zephyr (Premium Warm)</option>
              <option value="Kore">Female: Kore (Premium Clear)</option>
              <option value="Puck">Male: Puck (Premium Standard)</option>
              <option value="Charon">Male: Charon (Premium Deep)</option>
              <option value="GoogleTranslate">Female: Standard TTS (Fallback)</option>
            </select>
          </div>

          <button
            onClick={togglePlay}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer ${
              isPlaying 
                ? "bg-amber-400 text-slate-950 hover:bg-amber-500" 
                : "bg-emerald-400 text-slate-950 hover:bg-emerald-500"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Preview
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Play Full Video
              </>
            )}
          </button>
          <button
            onClick={toggleMute}
            className="p-2 border border-slate-800 hover:border-slate-700 hover:text-slate-200 text-slate-400 bg-slate-950/60 rounded-lg transition-all"
            title={isMuted ? "Unmute Preview Voice" : "Mute Preview Voice"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Adaptive HD Display Canvas & Recording Box */}
        <div className="xl:col-span-8 space-y-4">
          <div className={`relative ${isShorts ? 'aspect-[9/16] max-h-[500px] max-w-[281px] mx-auto' : 'aspect-video w-full'} bg-slate-950 rounded-xl overflow-hidden border border-slate-900 shadow-2xl flex items-center justify-center`}>
            <canvas
              ref={canvasRef}
              width={isShorts ? 480 : 854}
              height={isShorts ? 854 : 480}
              className="w-full h-full object-contain"
            />
            {isPlaying && (
              <div className="absolute top-4 right-4 bg-emerald-500/90 text-slate-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" /> VOICE ACTIVE
              </div>
            )}
          </div>

          {/* Compilation progress overlay */}
          {renderProgress >= 0 && (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-5 space-y-3.5 animate-fade-in shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {renderStatus}
                </span>
                <span className="text-emerald-400 font-mono font-bold">{renderProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-850">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                We are rendering all visual clips sequentially on a client-side frame canvas, drawing synchronized subtitles, overlaying cinematic lighting vignette overlays, and recording the high-fidelity narrator voice. Do not close this tab.
              </p>
            </div>
          )}

          {/* Export video control room */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" /> RENDER & COMPILE VIDEO OUTLET
              </h4>
              <p className="text-[11px] text-slate-400 font-sans">
                Exports the entire narrative sequence as a fully merged documentary video file (MP4/WebM) with 100% synchronized narration voiceover.
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`${run.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_full_documentary.webm`}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold font-mono rounded-lg transition-all"
                >
                  <Download className="w-4 h-4" /> Download Compiled Video
                </a>
              )}
              <button
                onClick={handleExportVideo}
                disabled={renderProgress >= 0 && renderProgress < 100}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-bold font-mono rounded-lg transition-all shadow-[0_0_12px_rgba(52,211,153,0.25)] disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${renderProgress >= 0 && renderProgress < 100 ? "animate-spin" : ""}`} /> 
                {renderProgress >= 0 && renderProgress < 100 ? "Rendering Video..." : "Merge & Compile Full Video"}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Scene Timeline & File Uploader Track */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 space-y-4 max-h-[580px] overflow-y-auto scrollbar-thin">
            <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase border-b border-slate-900 pb-2">
              VIDEO SCENE TIMELINE
            </h3>

            <div className="space-y-3">
              {scenes.map((scene, idx) => {
                const isActive = activeSceneIndex === idx;
                
                // Prefers user uploaded image, then generated AI image, then empty
                const uploadedImgUrl = uploadedImages[scene.id];
                const generatedImgUrl = run.thumbnail?.generatedImages?.[scene.imageIndex];
                const currentImgUrl = uploadedImgUrl || generatedImgUrl;

                return (
                  <div
                    key={scene.id}
                    onClick={() => {
                      stopPlayback();
                      setActiveSceneIndex(idx);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${
                      isActive
                        ? "bg-slate-900/80 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.06)]"
                        : "bg-slate-950 border-slate-900/60 hover:border-slate-850"
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      {/* Scene preview frame */}
                      <div className="relative w-16 h-10 bg-slate-900 rounded border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center group">
                        {currentImgUrl ? (
                          <img
                            src={currentImgUrl}
                            alt={scene.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="bg-slate-950 flex flex-col items-center justify-center w-full h-full">
                            <span className="text-[8px] font-bold text-slate-600">DARK</span>
                          </div>
                        )}
                        {uploadedImgUrl && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-[8px] font-bold text-slate-950 px-1 py-0.2 rounded-bl">
                            UPL
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-mono ${isActive ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                            {scene.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-850 px-1 py-0.2 rounded">
                            {scene.duration}s
                          </span>
                        </div>
                        
                        {/* Interactive narration editor */}
                        <textarea
                          value={scene.narrationText}
                          onChange={(e) => {
                            const updatedText = e.target.value;
                            setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, narrationText: updatedText } : s));
                          }}
                          onClick={(e) => e.stopPropagation()} 
                          rows={2}
                          className="w-full bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 text-[11px] text-slate-300 font-sans leading-relaxed border border-transparent hover:border-slate-850 focus:border-slate-800 focus:ring-0 p-1 rounded resize-none font-medium"
                          placeholder="Type voiceover lines..."
                        />
                      </div>
                    </div>

                    {/* Image Controls & Custom Uploader Box */}
                    <div className="border-t border-slate-900/60 pt-2.5 flex justify-between items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
                        <ImageIcon className="w-3 h-3 text-slate-500" />
                        {uploadedImgUrl ? (
                          <span className="text-emerald-400 font-medium">Custom Image Loaded</span>
                        ) : generatedImgUrl ? (
                          <span className="text-slate-400">AI Generated Image</span>
                        ) : (
                          <span className="text-amber-500/80">Cinematic Dark Fallback</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {/* Delete custom uploaded image if active */}
                        {uploadedImgUrl && (
                          <button
                            onClick={() => removeUploadedImage(scene.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete custom image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* File upload trigger button */}
                        <label className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-[10px] font-mono text-slate-300 cursor-pointer transition-colors">
                          <Upload className="w-3 h-3 text-emerald-400" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(scene.id, file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Active Segment Creator & Editor Controls Deck */}
                    {isActive && (
                      <div className="border-t border-slate-900/60 pt-3 mt-1 space-y-2.5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 animate-pulse text-emerald-400" /> Segment Editor Deck
                        </div>

                        {/* Row 1: Trim Clip duration & Toggle Audio track mute */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between bg-slate-950 border border-slate-900 rounded-lg p-1 px-2.5">
                            <span className="text-[9px] text-slate-500 uppercase font-mono">Trim Video:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => adjustDuration(idx, -1)}
                                disabled={scene.duration <= 2}
                                className="w-5 h-5 flex items-center justify-center bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 rounded border border-slate-800 text-[10px] font-bold"
                                title="Trim duration (-1s)"
                              >
                                -
                              </button>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold min-w-[20px] text-center">
                                {scene.duration}s
                              </span>
                              <button
                                onClick={() => adjustDuration(idx, 1)}
                                className="w-5 h-5 flex items-center justify-center bg-slate-900 text-slate-400 hover:text-white rounded border border-slate-800 text-[10px] font-bold"
                                title="Extend duration (+1s)"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleSceneAudio(idx)}
                            className={`flex items-center justify-between px-2.5 py-1 text-[9px] rounded-lg border font-mono transition-all ${
                              scene.audioDisabled
                                ? "bg-red-950/40 text-red-400 border-red-900/60 hover:bg-red-950/60"
                                : "bg-slate-950 text-slate-300 border-slate-900 hover:border-slate-850"
                            }`}
                            title={scene.audioDisabled ? "Enable narration voiceover audio" : "Mute/Delete narration voiceover audio"}
                          >
                            <span className="uppercase font-mono">Voiceover:</span>
                            <div className="flex items-center gap-1">
                              {scene.audioDisabled ? (
                                <VolumeX className="w-3.5 h-3.5 text-red-400" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span className="font-bold">{scene.audioDisabled ? "MUTED" : "ACTIVE"}</span>
                            </div>
                          </button>
                        </div>

                        {/* Row 2: Clip Splitting, Copying, and Merging Controls */}
                        <div className="flex gap-2 pt-1 border-t border-slate-900/40">
                          {/* Split clip (cut) */}
                          <button
                            onClick={() => splitScene(idx)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[9px] font-mono text-slate-300 hover:text-white rounded transition-colors"
                            title="Split/Cut this segment into two parts"
                          >
                            <Scissors className="w-3 h-3 text-emerald-400" />
                            <span>Split</span>
                          </button>

                          {/* Duplicate scene */}
                          <button
                            onClick={() => duplicateScene(idx)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[9px] font-mono text-slate-300 hover:text-white rounded transition-colors"
                            title="Duplicate this segment"
                          >
                            <Copy className="w-3 h-3 text-emerald-400" />
                            <span>Duplicate</span>
                          </button>

                          {/* Merge scenes */}
                          {idx < scenes.length - 1 && (
                            <button
                              onClick={() => mergeSceneWithNext(idx)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[9px] font-mono text-slate-300 hover:text-white rounded transition-colors"
                              title="Merge with next scene"
                            >
                              <Plus className="w-3 h-3 text-emerald-400" />
                              <span>Merge Next</span>
                            </button>
                          )}
                        </div>

                        {/* Row 3: Arranger Deck & Delete Button */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-900/40">
                          <div className="flex gap-1.5">
                            <button
                              disabled={idx === 0}
                              onClick={() => moveScene(idx, "up")}
                              className="p-1 px-1.5 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 border border-slate-900 rounded text-[9px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-all"
                              title="Move segment up"
                            >
                              <ChevronUp className="w-3 h-3" /> Up
                            </button>
                            <button
                              disabled={idx === scenes.length - 1}
                              onClick={() => moveScene(idx, "down")}
                              className="p-1 px-1.5 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 border border-slate-900 rounded text-[9px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-all"
                              title="Move segment down"
                            >
                              <ChevronDown className="w-3 h-3" /> Down
                            </button>
                          </div>

                          <button
                            onClick={() => deleteScene(idx)}
                            className="p-1 px-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-800/60 text-red-400 rounded text-[9px] font-mono flex items-center gap-1 transition-colors"
                            title="Delete this clip entirely"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Clip</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Video Editor: Add brand new scene clip */}
            <button
              onClick={addCustomScene}
              className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-800 hover:border-emerald-500/40 rounded-xl text-[10px] font-mono text-slate-300 hover:text-white transition-all shadow-sm"
              title="Add a custom new segment"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">Add Custom Scene Clip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
