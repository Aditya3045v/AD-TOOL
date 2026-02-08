import { useRef } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import TrustedBy from "@/components/landing/TrustedBy";
import SamplesSection from "@/components/landing/SamplesSection";
import BuilderSection from "@/components/landing/BuilderSection";
import Footer from "@/components/landing/Footer";
import HlsBackgroundVideo from "@/components/ui/HlsBackgroundVideo";

const Index = () => {
  const samplesRef = useRef<HTMLElement>(null);
  const builderRef = useRef<HTMLElement>(null);

  const scrollToSamples = () => {
    samplesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToBuilder = () => {
    builderRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Navbar onScrollToBuilder={scrollToBuilder} />

      {/* Fixed Background Layer — Higher performance than scrolling background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none contain-layout">
        <HlsBackgroundVideo url="https://customer-cbeadsgr09pnsezs.cloudflarestream.com/12a9780eeb1ea015801a5f55cf2e9d3d/manifest/video.m3u8" />
        {/* Subtle blur + dark overlay — same styling as Hero */}
        <div
          className="absolute inset-0 z-[1] transform-gpu"
          style={{
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            willChange: "backdrop-filter"
          }}
        />
        <div className="absolute inset-0 z-[2] bg-background/80" />
      </div>

      {/* Hero is separate and has its own background logic */}
      <HeroSection onScrollToSamples={scrollToSamples} onScrollToBuilder={scrollToBuilder} />

      {/* Content Layer (z-10 ensures it's above the fixed video) */}
      <main className="relative z-10">
        <TrustedBy />
        <SamplesSection sectionRef={samplesRef} />
        <BuilderSection sectionRef={builderRef} />
        <Footer />
      </main>
    </div>
  );
};

export default Index;
