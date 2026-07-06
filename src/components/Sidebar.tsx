import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Layers, 
  Settings, 
  Clock, 
  Zap, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ListTodo
} from "lucide-react";
import { ContentFactoryRun, PipelineStatus } from "../types";

interface SidebarProps {
  runs: ContentFactoryRun[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  onStartSingleRun: (companyName: string) => Promise<void>;
  onStartQueueRun: (companies: string[]) => Promise<void>;
  onDeleteRun: (id: string) => Promise<void>;
}

export default function Sidebar({
  runs,
  selectedRunId,
  onSelectRun,
  onStartSingleRun,
  onStartQueueRun,
  onDeleteRun,
}: SidebarProps) {
  const [singleName, setSingleName] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;
    setSubmitting(true);
    try {
      await onStartSingleRun(singleName.trim());
      setSingleName("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const companies = bulkInput
      .split(/[\n,]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (companies.length === 0) return;
    setSubmitting(true);
    try {
      await onStartQueueRun(companies);
      setBulkInput("");
      setBulkMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: PipelineStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "idle":
        return <Clock className="w-4 h-4 text-slate-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />;
    }
  };

  const completedCount = runs.filter((r) => r.status === "completed").length;
  const runningCount = runs.filter(
    (r) => r.status !== "completed" && r.status !== "failed" && r.status !== "idle"
  ).length;

  return (
    <div className="w-full lg:w-96 bg-slate-950 border-r border-slate-850 flex flex-col h-full text-slate-200 font-sans">
      {/* Factory Title and Branding */}
      <div className="p-6 border-b border-slate-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-400/10 p-2 rounded-lg border border-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
            <Layers className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase font-mono">Content Factory</h2>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Multi-Agent AI Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 uppercase">
          <Zap className="w-3 h-3" /> Live
        </div>
      </div>

      {/* Input Creator Workplace */}
      <div className="p-5 border-b border-slate-850 bg-slate-900/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase font-mono">
            {bulkMode ? "Daily Automation Pipeline" : "Single Agent Launch"}
          </span>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono underline cursor-pointer"
          >
            {bulkMode ? "Switch to Single" : "Batch Queue (+)"}
          </button>
        </div>

        {bulkMode ? (
          <form onSubmit={handleSubmitBulk} className="space-y-3">
            <textarea
              className="w-full h-24 bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-600 rounded-lg p-3 text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none font-mono"
              placeholder="Enter company names separated by commas or lines...&#10;e.g. Yahoo, Blockbuster, MySpace"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !bulkInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-semibold rounded-lg font-mono transition-colors disabled:opacity-40 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Launching Factory...
                </>
              ) : (
                <>
                  <ListTodo className="w-3.5 h-3.5" /> Queue Automated Batch
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitSingle} className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-600 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none font-sans"
              placeholder="Enter company (e.g., Nokia)"
              value={singleName}
              onChange={(e) => setSingleName(e.target.value)}
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !singleName.trim()}
              className="bg-emerald-400 hover:bg-emerald-500 text-slate-950 px-3 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>

      {/* Statistics counters */}
      <div className="grid grid-cols-2 text-center border-b border-slate-850 bg-slate-950">
        <div className="py-2.5 border-r border-slate-850">
          <span className="text-lg font-mono font-bold text-slate-200">{completedCount}</span>
          <p className="text-[9px] text-slate-500 tracking-wider font-mono uppercase mt-0.5">Finished Packages</p>
        </div>
        <div className="py-2.5">
          <span className="text-lg font-mono font-bold text-emerald-400">{runningCount}</span>
          <p className="text-[9px] text-slate-500 tracking-wider font-mono uppercase mt-0.5">Active Processing</p>
        </div>
      </div>

      {/* List of generation runs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase font-mono block px-1 mb-2">
          History Ledger ({runs.length})
        </span>

        {runs.length === 0 ? (
          <div className="text-center py-10 text-slate-600 font-sans">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No active content history.</p>
            <p className="text-[10px] mt-1">Submit a company above to spawn agents.</p>
          </div>
        ) : (
          runs.map((run) => {
            const isSelected = selectedRunId === run.id;
            return (
              <div
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-slate-900 border-slate-800 shadow-md ring-1 ring-emerald-500/20"
                    : "bg-slate-950/40 border-slate-900 hover:bg-slate-900 hover:border-slate-850"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="mt-0.5">{getStatusBadge(run.status)}</div>
                  <div className="min-w-0">
                    <h4 className={`text-xs font-medium truncate ${isSelected ? "text-emerald-400" : "text-slate-200"}`}>
                      {run.companyName}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-500 uppercase mt-0.5 block">
                      {run.status === "completed" ? (
                        "Ready to publish"
                      ) : run.status === "failed" ? (
                        <span className="text-red-400">Execution Error</span>
                      ) : (
                        `Stage: ${run.status.replace("_", " ")}`
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRun(run.id);
                  }}
                  className="p-1 text-slate-600 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Wipe record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
