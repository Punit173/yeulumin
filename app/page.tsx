"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Shield, Cpu, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import GrainOverlay from "./components/GrainOverlay";
import ParticleCanvas from "./components/ParticleCanvas";
import dynamic from "next/dynamic";
import { useViewerStore } from "@/components/viewer/useViewerStore";
import { PRODUCTS } from "./lib/products";

// Dynamically import the interactive 3D T-shirt configurator viewer
const TshirtViewer = dynamic(() => import("@/components/viewer/TshirtViewer"), {
  ssr: false,
});

// Client-side text-scramble/glitch effect component
function GlitchText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!_";

  useEffect(() => {
    let iteration = 0;
    let interval: NodeJS.Timeout;

    const triggerGlitch = () => {
      iteration = 0;
      clearInterval(interval);
      interval = setInterval(() => {
        setDisplayText(
          text
            .split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < iteration) {
                return text[index];
              }
              return letters[Math.floor(Math.random() * letters.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          clearInterval(interval);
        }
        iteration += 1 / 3;
      }, 25);
    };

    triggerGlitch();
    const mainInterval = setInterval(triggerGlitch, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(mainInterval);
    };
  }, [text]);

  return (
    <span className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none bg-gradient-to-r from-[#f5f5f5] via-white to-neutral-400 bg-clip-text text-transparent">
      {displayText}
    </span>
  );
}

export default function Home() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const setColor = useViewerStore((state) => state.setColor);
  const setDesign = useViewerStore((state) => state.setDesign);

  const [isMobile, setIsMobile] = useState(false);

  // Set default futuristic preview state for the home page hero configurator
  useEffect(() => {
    setColor("#1a1a1a");
    setDesign("logo");

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setColor, setDesign]);
  
  // Carousel Navigation
  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 350;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const trendingDrops = PRODUCTS.slice(0, 4);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0A0A0A] text-[#f5f5f5]">
      {/* Brand aesthetic overlays */}
      <GrainOverlay />
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[calc(100vh-80px)] overflow-hidden">
        {/* Dynamic Canvas Particles */}
        <ParticleCanvas />

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-neon/5 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-violet/5 blur-[150px] pointer-events-none z-0" />

        {/* ─── MOBILE LAYOUT (< md) ─── */}
        <div className="flex flex-col h-[calc(100vh-80px)] md:hidden relative">

          {/* Full-screen immersive background */}
          <div className="absolute inset-0">
            {/* Radial gradient base */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_35%,rgba(0,255,178,0.06)_0%,rgba(123,47,255,0.04)_50%,transparent_80%)] pointer-events-none" />
            
            {/* Animated scan line */}
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-neon/20 to-transparent animate-[float_4s_ease-in-out_infinite] pointer-events-none" style={{ top: '30%' }} />
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-violet/15 to-transparent animate-[float_5s_ease-in-out_infinite_reverse] pointer-events-none" style={{ top: '65%' }} />

            {/* Corner accent lines */}
            <div className="absolute top-6 left-6 w-8 h-8 border-l border-t border-neon/20 pointer-events-none" />
            <div className="absolute top-6 right-6 w-8 h-8 border-r border-t border-neon/20 pointer-events-none" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-l border-b border-violet/20 pointer-events-none" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-r border-b border-violet/20 pointer-events-none" />
          </div>

          {/* ── Center composition ── */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">

            {/* Top micro-badge */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neon/30 bg-neon/5 px-3 py-1 text-[9px] font-bold text-neon uppercase tracking-[3px] font-mono">
                <Sparkles className="h-2.5 w-2.5" />
                <span>AI-Powered Fashion</span>
              </div>
            </div>

            {/* Floating T-shirt with logo */}
            <div className="relative mb-8">
              {/* Outer orbital ring */}
              <div className="absolute inset-0 m-auto w-52 h-52 rounded-full border border-neon/8 animate-[spin_20s_linear_infinite] pointer-events-none z-20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_#00FFB2,0_0_16px_#00FFB2]" />
              </div>
              {/* Inner orbital ring (counter-rotate) */}
              <div className="absolute inset-0 m-auto w-36 h-36 rounded-full border border-violet/10 animate-[spin_14s_linear_infinite_reverse] pointer-events-none z-20">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-1 w-1 rounded-full bg-violet shadow-[0_0_6px_#7B2FFF]" />
              </div>

              {/* 3D T-shirt viewer */}
              <div className="relative w-52 h-52 rounded-full overflow-hidden">
                <div className="absolute inset-0 rounded-full bg-neon/10 blur-3xl scale-75 pointer-events-none z-0" />
                <TshirtViewer scale={1.4} autoRotateSpeed={3} cameraDistance={3.4} />
              </div>
            </div>

            {/* Headline */}
            <h1 className="font-display text-[2.5rem] font-black tracking-tight leading-[0.95] text-center text-white mb-3">
              WEAR YOUR<br />
              <span className="text-neon glow-text-neon">IMAGINATION</span>
            </h1>

            {/* Tagline */}
            <p className="text-sm text-neutral-500 text-center max-w-[260px] leading-relaxed font-light">
              Design custom streetwear with AI. Preview in 3D. Ship worldwide.
            </p>
          </div>

          {/* ── Bottom section: Stats + CTAs ── */}
          <div className="relative z-10 px-5 pb-6 flex flex-col gap-3">

            {/* Horizontal stat strip */}
            <div className="flex items-center justify-between border-t border-neutral-800/60 pt-3 px-1">
              {[
                { value: "280GSM", label: "Cotton" },
                { value: "AI", label: "Design" },
                { value: "3D", label: "Preview" },
                { value: "48HR", label: "Ship" },
              ].map((stat, i) => (
                <div key={stat.label} className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-black text-neon font-mono tracking-wide">{stat.value}</span>
                  <span className="text-[8px] text-neutral-600 uppercase tracking-wider font-mono">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA */}
            <Link
              href="/customize"
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-neon py-4 text-sm font-black text-[#0A0A0A] uppercase tracking-widest glow-neon transition-all duration-200 active:scale-[0.97]"
            >
              <Sparkles className="h-4 w-4 fill-current" />
              <span>Start Designing</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Secondary CTA */}
            <Link
              href="/products"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-[#111111]/50 py-3.5 text-xs font-semibold text-neutral-400 uppercase tracking-widest transition-all duration-200 active:scale-[0.97]"
            >
              <span>Browse Collection</span>
            </Link>
          </div>
        </div>

        {/* ─── DESKTOP LAYOUT (≥ md) ─── */}
        <div className="hidden md:flex items-center justify-center min-h-[calc(100vh-80px)] py-12 md:py-20">
          <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center z-10">

            {/* Hero Left Content */}
            <div className="lg:col-span-7 flex flex-col items-start text-left gap-6 md:gap-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/5 px-3 py-1 text-xs font-semibold text-neon glow-text-neon uppercase tracking-widest font-mono">
                <Sparkles className="h-3 w-3" />
                <span>Next-Gen Neural Print Lab</span>
              </div>

              <div className="flex flex-col">
                <GlitchText text="WEAR YOUR" />
                <span className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none text-neon glow-text-neon -mt-2">
                  IMAGINATION
                </span>
              </div>

              <p className="max-w-xl text-base sm:text-lg text-neutral-400 font-light leading-relaxed">
                Design any T-shirt with AI in seconds. Interact with your customized clothing on a 3D showroom mannequin. We print in heavy-density ink and ship worldwide.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4 w-full sm:w-auto">
                <Link
                  href="/customize"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-neon px-6 py-3.5 text-sm font-semibold text-[#0A0A0A] hover:bg-[#00e6a0] transition-all duration-300 glow-neon"
                >
                  <span>Start Designing</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-[#111111]/40 hover:bg-[#111111]/80 hover:border-neutral-700 px-6 py-3.5 text-sm font-semibold text-neutral-300 transition-all duration-200"
                >
                  <span>Browse Collection</span>
                </Link>
              </div>
            </div>

            {/* Hero Right Content: 3D Configurator */}
            <div className="lg:col-span-5 w-full h-[500px] lg:h-[620px] rounded-2xl overflow-hidden border border-neutral-800/80 bg-[#111111]/45 backdrop-blur-xl z-10 shadow-[0_0_50px_rgba(0,255,178,0.15)] hover:border-neon/30 transition-all duration-500">
              <TshirtViewer scale={1.5} autoRotateSpeed={2.5} cameraDistance={3.2} />
            </div>

          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section className="py-24 border-y border-neutral-900 bg-[#0A0A0A] relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-widest text-[#f5f5f5]">
              System Protocol
            </h2>
            <div className="h-[2px] w-12 bg-neon mx-auto mt-4" />
            <p className="text-xs uppercase font-mono tracking-widest text-neutral-500 mt-3">
              Three stages to custom generative streetwear
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "Describe Your Vision",
                desc: "Type a prompt detailing your aesthetic—whether it's cyberpunk circuitry, abstract liquid geometries, or glowing typography.",
                icon: Cpu,
              },
              {
                num: "02",
                title: "Preview in Showroom",
                desc: "Your prompt generates high-fidelity designs immediately. Wrap the texture onto our interactive 3D mannequin, rotate, and select base tee colors.",
                icon: Shield,
              },
              {
                num: "03",
                title: "Checkout & Ship",
                desc: "Choose your sizing. We print using high-density tactile plastisol ink, pack it in metallic courier shielding, and deliver worldwide.",
                icon: Truck,
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="group relative flex flex-col bg-[#111111]/30 border border-neutral-900 rounded-xl p-8 transition-all duration-300 hover:bg-[#111111]/60 hover:border-neon/30"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-4xl font-black font-display text-neutral-800 group-hover:text-neon transition-colors">
                    {step.num}
                  </span>
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 group-hover:text-neon group-hover:border-neon/30 transition-colors">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-neutral-200 mb-3 group-hover:text-white">
                  {step.title}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TRENDING DROPS CAROUSEL */}
      <section className="py-24 bg-[#0A0A0A] relative z-10 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-widest text-[#f5f5f5]">
                Trending Drops
              </h2>
              <div className="h-[2px] w-12 bg-violet mt-4" />
            </div>
            
            <div className="flex items-center gap-4 mt-6 sm:mt-0">
              <Link
                href="/products"
                className="text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:text-neon transition-colors flex items-center gap-1.5"
              >
                <span>See All Drops</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scroll("left")}
                  className="p-2 rounded-lg bg-[#111111] border border-neutral-800 hover:border-neutral-700 hover:text-neon transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  className="p-2 rounded-lg bg-[#111111] border border-neutral-800 hover:border-neutral-700 hover:text-neon transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel */}
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory no-scrollbar"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {trendingDrops.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start bg-[#111111]/40 border border-neutral-900 hover:border-neon/30 rounded-xl overflow-hidden group transition-all duration-300"
              >
                {/* Product Image */}
                <div className="relative aspect-square w-full bg-neutral-950 overflow-hidden">
                  {/* Badge */}
                  <span className="absolute top-3 left-3 z-10 text-[9px] font-mono font-bold tracking-widest uppercase bg-[#0A0A0A] border border-neutral-800 text-neon px-2 py-0.5 rounded">
                    {product.badge}
                  </span>
                  
                  {/* Image with zoom on hover */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                    <Link
                      href={`/customize?preset=${product.id}`}
                      className="w-full text-center py-2 bg-neon text-[#0A0A0A] text-xs font-semibold rounded-lg glow-neon transition-transform"
                    >
                      Remix in Lab
                    </Link>
                  </div>
                </div>

                {/* Product Detail */}
                <div className="p-5 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500">
                    {product.category}
                  </span>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-neutral-200 text-sm group-hover:text-white transition-colors">
                      {product.name}
                    </h3>
                    <span className="font-mono text-neon font-bold text-sm">
                      ₹{product.price}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. PRESS & SOCIAL PROOF */}
      <section className="py-24 border-t border-neutral-900 bg-[#0B0B0B] relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Fictional Press Logos */}
          <div className="text-center mb-16">
            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-6">
              Transmitting on standard channels
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-35 hover:opacity-50 transition-opacity">
              {["WIRED FUTURE", "NEO THREAD", "HYPEGRID", "CYBORG MONTHLY"].map((logo, idx) => (
                <span key={idx} className="font-display text-xl sm:text-2xl font-black tracking-widest text-neutral-400">
                  {logo}
                </span>
              ))}
            </div>
          </div>

          {/* Testimonial Quote Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {[
              {
                quote: "The print density is insane. Standard streetwear washes off or peels; this is high-end tactile plastisol. The AI prompt customized it exactly down to the color weights. Genuinely futuristic.",
                author: "Jax V.",
                title: "Techwear Collector & Editor",
              },
              {
                quote: "I was skeptical about procedural clothing, but remixing design nodes in the 3D mannequin showroom was seamless. Shipping came inside an anti-static metallic protective sleeve. 10/10.",
                author: "Kira 0x",
                title: "Digital Art Architect",
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="bg-[#111111]/20 border border-neutral-900/60 rounded-xl p-8 flex flex-col justify-between"
              >
                <p className="text-sm font-light text-neutral-400 italic leading-relaxed mb-6">
                  "{t.quote}"
                </p>
                <div className="flex flex-col">
                  <span className="font-mono text-neon text-xs font-semibold uppercase tracking-wider">
                    {t.author}
                  </span>
                  <span className="text-[10px] text-neutral-600 uppercase mt-0.5">
                    {t.title}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 5. BRAND CTA BANNER */}
      <section className="relative py-28 border-t border-neutral-900 bg-[#0A0A0A] overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-neon/5 to-violet/5 pointer-events-none" />
        
        <div className="mx-auto max-w-4xl px-4 text-center flex flex-col items-center gap-6 relative z-10">
          <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#f5f5f5] leading-none">
            YOUR NEXT FAVORITE SHIRT <br />
            <span className="text-neon glow-text-neon">DOESN'T EXIST YET.</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg font-light leading-relaxed">
            Stop wearing mass-produced templates. Access our neural customization matrices and compile your own streetwear code.
          </p>
          <Link
            href="/customize"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neon px-8 py-4 text-sm font-semibold text-[#0A0A0A] hover:bg-[#00e6a0] transition-all duration-300 glow-neon"
          >
            <Sparkles className="h-4 w-4" />
            <span>CREATE IT NOW</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
