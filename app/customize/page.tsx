"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ViewerControls from "@/components/viewer/ViewerControls";
import { useViewerStore } from "@/components/viewer/useViewerStore";
import { Sparkles, ArrowLeft } from "lucide-react";

// Dynamically import the 3D Viewer to disable SSR (Window and WebGL references)
const TshirtViewer = dynamic(() => import("@/components/viewer/TshirtViewer"), {
  ssr: false,
});

export default function CustomizePage() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTag, setSelectedTag] = useState("Futuristic");
  const setDesign = useViewerStore((state) => state.setDesign);

  const styleTags = ["Abstract", "Minimal", "Vintage", "Futuristic", "Illustrative", "Typographic"];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);

    // Simulate AI compilation delay and map inputs to our 3D procedural designs
    setTimeout(() => {
      setIsGenerating(false);
      const lowerPrompt = prompt.toLowerCase();

      if (lowerPrompt.includes("circuit") || lowerPrompt.includes("cyber") || selectedTag === "Futuristic") {
        setDesign("circuit");
      } else if (lowerPrompt.includes("abstract") || lowerPrompt.includes("line") || selectedTag === "Abstract") {
        setDesign("abstract");
      } else if (lowerPrompt.includes("stripe") || selectedTag === "Minimal") {
        setDesign("stripe");
      } else if (lowerPrompt.includes("logo") || selectedTag === "Typographic") {
        setDesign("logo");
      } else {
        setDesign("ai");
      }
    }, 2000);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] overflow-hidden text-white font-sans">
      {/* Left: AI Prompt Panel */}
      <div className="w-72 border-r border-[#1f1f1f] flex flex-col p-5 gap-5 bg-[#0d0d0d] flex-shrink-0 select-none">
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-500 hover:text-[#00FFB2] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Core</span>
          </Link>
          <div className="h-[1px] bg-[#1f1f1f] w-full" />
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-[#00FFB2] text-xs font-bold tracking-[3px] uppercase flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 fill-current" />
            <span>Design with AI</span>
          </h2>
          <span className="text-[10px] text-neutral-500 font-mono">
            NEURAL COMPILING UNIT
          </span>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col gap-5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Describe your design... e.g. "A dragon made of circuit boards, cyberpunk style"'
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-xs text-white placeholder-[#444] resize-none h-32 focus:outline-none focus:border-[#00FFB2] transition-colors leading-relaxed"
          />

          {/* Style tags */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              Aesthetic Anchors
            </span>
            <div className="flex flex-wrap gap-2">
              {styleTags.map((tag) => {
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`text-[9px] px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 ${
                      isActive
                        ? "border-[#00FFB2] text-[#00FFB2] bg-[#00FFB2]/5"
                        : "border-[#2a2a2a] text-[#666] hover:border-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 rounded-xl bg-[#00FFB2] text-black font-bold text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            {isGenerating ? "Compiling..." : "Generate →"}
          </button>
        </form>

        {/* Loading state (show when generating) */}
        {isGenerating && (
          <div className="text-center text-xs text-neutral-500 animate-pulse font-mono py-2">
            Yeulumin AI is weaving your design...
          </div>
        )}
      </div>

      {/* Center: 3D Viewer */}
      <div className="flex-1 relative h-full">
        <TshirtViewer />
      </div>

      {/* Right: Controls Panel */}
      <ViewerControls />
    </div>
  );
}
