import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import AgentStatusVisualizer from "./components/AgentStatusVisualizer";
import Workspace from "./components/Workspace";
import { ContentFactoryRun } from "./types";
import { 
  Layers, 
  Search, 
  CheckCircle2, 
  FileText, 
  Youtube, 
  Image as ImageIcon, 
  TrendingUp, 
  Megaphone,
  Mic,
  Clapperboard,
  CornerDownRight,
  Database
} from "lucide-react";

export default function App() {
  const [runs, setRuns] = useState<ContentFactoryRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Synchronize history from server
  const fetchRuns = async () => {
    try {
      const response = await fetch("/api/runs");
      if (response.ok) {
        const data = await response.json();
        setRuns(data);

        // Auto-select the first run if none is selected
        if (data.length > 0 && !selectedRunId) {
          setSelectedRunId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading factory history:", err);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Polling mechanism for active (processing) pipeline runs
  useEffect(() => {
    const activeRuns = runs.filter(
      (r) => r.status !== "completed" && r.status !== "failed" && r.status !== "idle"
    );

    if (activeRuns.length === 0) return;

    const timer = setInterval(() => {
      fetchRuns();
    }, 2000);

    return () => clearInterval(timer);
  }, [runs]);

  const handleStartSingleRun = async (companyName: string) => {
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });
      if (response.ok) {
        const newRun = await response.json();
        setSelectedRunId(newRun.id);
        fetchRuns();
      }
    } catch (err) {
      console.error("Failed to start pipeline:", err);
    }
  };

  const handleStartQueueRun = async (companies: string[]) => {
    try {
      const response = await fetch("/api/runs/queue-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companies }),
      });
      if (response.ok) {
        fetchRuns();
      }
    } catch (err) {
      console.error("Failed to start automated queue:", err);
    }
  };

  const handleDeleteRun = async (id: string) => {
    try {
      const response = await fetch(`/api/runs/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        if (selectedRunId === id) {
          setSelectedRunId(null);
        }
        fetchRuns();
      }
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  };

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      
      {/* LEFT PANEL: Creator Control Hub */}
      <Sidebar
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={(id) => setSelectedRunId(id)}
        onStartSingleRun={handleStartSingleRun}
        onStartQueueRun={handleStartQueueRun}
        onDeleteRun={handleDeleteRun}
      />

      {/* RIGHT WORKPLACE: Factory Console */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {selectedRun ? (
          <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 lg:p-8">
            {selectedRun.status !== "completed" ? (
              /* ACTIVE PIPELINE AGENTS SCREEN */
              <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                <AgentStatusVisualizer
                  status={selectedRun.status}
                  progress={selectedRun.progress}
                  companyName={selectedRun.companyName}
                  error={selectedRun.error}
                />
              </div>
            ) : (
              /* DELIVERED CREATOR WORKSPACE */
              <div className="flex-1 overflow-hidden">
                <Workspace run={selectedRun} onRefresh={fetchRuns} />
              </div>
            )}
          </div>
        ) : (
          /* EMPTY STATE LANDING SCREEN: FACTORY ARCHITECTURE SYSTEM OVERVIEW */
          <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 flex flex-col items-center justify-center max-w-4xl mx-auto text-center space-y-12">
            
            {/* Landing Title */}
            <div className="space-y-4">
              <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-full px-4 py-1 text-emerald-400 font-mono text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                <Database className="w-3.5 h-3.5" /> High-Concurrency Factory Design
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight font-sans">
                AI YouTube Content Factory
              </h1>
              <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
                Submit a company profile to trigger a cascading multi-agent factory. Each specialized agent has one objective, passing contextual knowledge pipelines downstream to construct premium, high-retention video assets.
              </p>
            </div>

            {/* Hierarchical Pipeline Map (Beautiful SVG/HTML diagram mimicking exact user request) */}
            <div className="w-full bg-slate-900/40 border border-slate-850 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Pipeline Architecture Diagram</span>
              
              <div className="flex flex-col items-center space-y-6">
                
                {/* Stage 1: Research Agent */}
                <div className="flex flex-col items-center">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
                    <Search className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <h4 className="text-xs font-semibold text-slate-100 font-mono">Research AI Agent</h4>
                      <p className="text-[9px] text-slate-500">Milestones, IPO details, PR controversies</p>
                    </div>
                  </div>
                  <div className="w-0.5 h-6 bg-slate-800" />
                </div>

                {/* Stage 2: Fact Verification Agent */}
                <div className="flex flex-col items-center">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <h4 className="text-xs font-semibold text-slate-100 font-mono">Fact Verification Agent</h4>
                      <p className="text-[9px] text-slate-500">Cross-verifies dates, figures, & tenures</p>
                    </div>
                  </div>
                  <div className="w-0.5 h-6 bg-slate-800" />
                </div>

                {/* Stage 3: Storytelling AI Agent */}
                <div className="flex flex-col items-center">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <h4 className="text-xs font-semibold text-slate-100 font-mono">Storytelling AI Agent</h4>
                      <p className="text-[9px] text-slate-500">Netflix-style cinematic emotional layout</p>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider Split Lines */}
                <div className="relative w-11/12 h-6">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-800" />
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-800" />
                </div>

                {/* Stage 4: Downstream Concurrent Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-1">
                  
                  {/* Column 1: Scripts Division */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-5 bg-slate-800 md:hidden" />
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 w-full shadow-lg text-left space-y-2">
                      <div className="flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold text-slate-100 font-mono">Script Agent</h4>
                      </div>
                      <p className="text-[9px] text-slate-500">Detailed long scripts, video segment cues, and vertical shorts layout.</p>
                      <div className="border-t border-slate-900/80 pt-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <Mic className="w-3 h-3 text-emerald-400" /> Narration Voice-Over Script
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <Clapperboard className="w-3 h-3 text-emerald-400" /> Drone & Video B-Roll Prompts
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <Megaphone className="w-3 h-3 text-emerald-400" /> Social Platform Promo Packages
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Graphics Division */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-5 bg-slate-800 md:hidden" />
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 w-full shadow-lg text-left space-y-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold text-slate-100 font-mono">Thumbnail Agent</h4>
                      </div>
                      <p className="text-[9px] text-slate-500">Click-friendly layouts, contrasting text, focus subjects, and styling guides.</p>
                      <div className="border-t border-slate-900/80 pt-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <CornerDownRight className="w-3 h-3 text-emerald-400" /> High-Def AI Image Prompts
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Optimization Division */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-5 bg-slate-800 md:hidden" />
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 w-full shadow-lg text-left space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold text-slate-100 font-mono">SEO Agent</h4>
                      </div>
                      <p className="text-[9px] text-slate-500">10 high-CTR video title options, long metadata description summaries.</p>
                      <div className="border-t border-slate-900/80 pt-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <CornerDownRight className="w-3 h-3 text-emerald-400" /> Timestamps and Music Curations
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            <p className="text-slate-600 text-[11px] font-mono">
              Ready to automate? Input Nokia, Blockbuster, or Yahoo in the control sidebar above to launch the factory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
