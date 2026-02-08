import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, X, Check, Download, Copy, Sparkles, Image as ImageIcon, Palette, MessageSquare, Instagram, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { generateCampaign } from "@/services/adGenerator";

interface BuilderSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

const INDUSTRIES = ["Fashion", "Food", "Tech", "Beauty", "Real Estate", "Automotive", "Travel"];
const THEMES = ["Diwali", "New Year", "Black Friday", "Sale", "Minimal", "Premium", "Industrial"];
const STYLES = ["Photorealistic", "Neon", "Pastel", "Luxury", "Dynamic", "Minimalist"];
const TONES = ["Professional", "Witty", "Elegant", "Bold", "Friendly", "Luxurious"];
const AUDIENCES = ["Gen Z", "Modern Professionals", "Luxury Buyers", "Small Business Owners", "Fitness Enthusiasts"];

const PIPELINE_STEPS = [
  { label: "Product Vision Analysis", icon: "👁️" },
  { label: "Creative Directing Blueprint", icon: "🧠" },
  { label: "Chromatic Harmony Check", icon: "🎨" },
  { label: "Neural Image Synthesis", icon: "⚡" },
  { label: "Crafting High-Conversion Copy", icon: "✍️" },
];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const BuilderSection = ({ sectionRef }: BuilderSectionProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const productInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [headlineText, setHeadlineText] = useState("");
  const [visualStyle, setVisualStyle] = useState(STYLES[0]);
  const [brandColor, setBrandColor] = useState("#8B5CF6");
  const [brandTone, setBrandTone] = useState(TONES[0]);
  const [targetAudience, setTargetAudience] = useState(AUDIENCES[0]);
  const [aspectRatio, setAspectRatio] = useState("square"); // square or portrait

  // File state
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);

  const handleFileSelect = (
    file: File | undefined,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB.", variant: "destructive" });
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };


  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!brandName.trim() || !headlineText.trim()) {
        toast({ title: "Missing fields", description: "Please fill in Brand Name and Main Offer.", variant: "destructive" });
        return;
      }

      setIsGenerating(true);
      setGeneratedImage(null);
      setGeneratedCaption(null);
      setCurrentStep(0);

      try {
        let productImageBase64: string | undefined;
        let productImageMimeType: string | undefined;

        if (productFile) {
          productImageBase64 = await fileToBase64(productFile);
          productImageMimeType = productFile.type;
          setCurrentStep(0);
        } else {
          setCurrentStep(1);
        }

        // Simulate step progression with timing for better UX
        const stepTimer = setInterval(() => {
          setCurrentStep((prev) => {
            if (prev < 4) return prev + 1;
            clearInterval(stepTimer);
            return prev;
          });
        }, 4000);

        // Call the frontend service directly (bypassing Supabase Edge Functions)
        const { imageUrl, caption } = await generateCampaign({
          brandName,
          industry,
          theme,
          headlineText,
          visualStyle,
          brandColor,
          brandTone,
          targetAudience,
          aspectRatio,
          productImageBase64,
          productImageMimeType: productFile?.type,
        });

        console.log("=== GENERATION COMPLETE ===");
        clearInterval(stepTimer);

        setCurrentStep(4);
        setGeneratedImage(imageUrl);
        setGeneratedCaption(caption || null);

      } catch (e: any) {
        console.error("=== GENERATION ERROR ===", e);
        toast({
          title: "Generation failed",
          description: e.message || "Could not generate campaign. Please verify API key.",
          variant: "destructive",
        });
      } finally {
        setTimeout(() => setIsGenerating(false), 500);
      }
    },
    [brandName, industry, theme, headlineText, visualStyle, brandColor, productFile, toast]
  );

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `${brandName || "adgen"}-campaign.png`;
    link.click();
  };

  const handleCopyCaption = () => {
    if (!generatedCaption) return;
    navigator.clipboard.writeText(generatedCaption);
    setCaptionCopied(true);
    toast({ title: "Caption Copied", description: "Ready to paste on social media!" });
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!generatedCaption) return;
    const text = `*New Campaign from ${brandName}:*\n\n${generatedCaption}\n\nGenerated with AI Ad Studio`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const shareToInstagram = () => {
    handleCopyCaption();
    toast({
      title: "Instagram Ready",
      description: "Caption copied! Opening Instagram...",
    });
    // Deep link to Instagram
    setTimeout(() => {
      window.open("https://www.instagram.com/", "_blank");
    }, 1000);
  };

  const inputClasses =
    "w-full bg-[hsl(var(--glass-bg))] border border-[hsl(var(--glass-border))] p-3 px-4 rounded-xl text-foreground font-sans text-sm outline-none transition-colors duration-300 focus:border-accent-violet";
  const labelClasses = "block text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2";
  const selectClasses = `${inputClasses} appearance-none cursor-pointer [&>option]:bg-background [&>option]:text-foreground`;

  return (
    <section ref={sectionRef} className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[hsl(var(--glass-bg))] border border-[hsl(var(--glass-border))] rounded-full text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI Campaign Studio
          </div>
          <h2 className="font-heading text-[40px] font-semibold mb-4">Start Your Campaign</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Fill in your brand details, upload assets, and let our 3-step AI pipeline generate
            stunning marketing creatives with matching captions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 transition-opacity duration-300">
            {/* ========== LEFT: Form (3 cols) ========== */}
            <div className="lg:col-span-3 bg-[hsl(var(--glass-bg))] border border-[hsl(var(--glass-border))] p-6 md:p-8 rounded-3xl space-y-5">
              {/* Brand Name + Industry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Luxe Beauty"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Industry</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClasses}>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Theme + Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Occasion / Theme</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value)} className={selectClasses}>
                    {THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Visual Style</label>
                  <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} className={selectClasses}>
                    {STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tone + Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Brand Tone</label>
                  <select
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    className={selectClasses}
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className={selectClasses}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className={labelClasses}>Main Offer / Headline</label>
                <input
                  type="text"
                  placeholder='e.g. "50% OFF — Limited Time!"'
                  required
                  value={headlineText}
                  onChange={(e) => setHeadlineText(e.target.value)}
                  className={inputClasses}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 opacity-70">
                  This text will appear directly on the generated image.
                </p>
              </div>

              {/* Color Picker + Format */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClasses}>Brand Color</label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-[hsl(var(--glass-border))] cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className={`${inputClasses} flex-1 font-mono uppercase`}
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Format</label>
                  <div className="flex bg-[hsl(var(--glass-bg))] border border-[hsl(var(--glass-border))] p-1 rounded-xl h-[42px]">
                    <button
                      type="button"
                      onClick={() => setAspectRatio("square")}
                      className={`flex-1 rounded-lg text-[10px] font-bold transition-all ${aspectRatio === "square" ? "bg-accent-violet text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      POST
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio("portrait")}
                      className={`flex-1 rounded-lg text-[10px] font-bold transition-all ${aspectRatio === "portrait" ? "bg-accent-violet text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      STORY
                    </button>
                  </div>
                </div>
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Image */}
                <div>
                  <label className={labelClasses}>Upload Product Image</label>
                  <div
                    className="border-2 border-dashed border-[hsl(var(--glass-border))] rounded-2xl h-[160px] flex justify-center items-center text-center cursor-pointer transition-all duration-300 hover:border-accent-violet hover:bg-accent-violet/5 relative overflow-hidden"
                    onClick={() => productInputRef.current?.click()}
                  >
                    {productPreview ? (
                      <>
                        <img src={productPreview} alt="Product" className="absolute inset-0 w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductFile(null);
                            setProductPreview(null);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center gap-1.5 px-4">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                        <p className="text-xs leading-tight">
                          Upload a clear photo of your product.
                          <br />
                          <span className="opacity-60">AI will analyze & place it in the design.</span>
                        </p>
                      </div>
                    )}
                    <input
                      ref={productInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files?.[0], setProductFile, setProductPreview)}
                    />
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <label className={labelClasses}>Upload Brand Logo</label>
                  <div
                    className="border-2 border-dashed border-[hsl(var(--glass-border))] rounded-2xl h-[160px] flex justify-center items-center text-center cursor-pointer transition-all duration-300 hover:border-accent-violet hover:bg-accent-violet/5 relative overflow-hidden"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Logo" className="absolute inset-0 w-full h-full object-contain p-4 bg-background/50" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoFile(null);
                            setLogoPreview(null);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center gap-1.5 px-4">
                        <Palette className="w-8 h-8 opacity-50" />
                        <p className="text-xs leading-tight">
                          Upload your logo (PNG).
                          <br />
                          <span className="opacity-60">Overlaid on the final design for branding.</span>
                        </p>
                      </div>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files?.[0], setLogoFile, setLogoPreview)}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-accent-violet text-foreground py-3.5 px-8 rounded-full font-semibold text-sm border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_hsl(var(--accent-violet)/0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Campaign
                  </>
                )}
              </button>
            </div>

            {/* ========== RIGHT: Preview Card (2 cols) ========== */}
            <div className="lg:col-span-2 flex items-start justify-center">
              <div className="w-full max-w-[360px] sticky top-24">
                {/* Phone Frame */}
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--glass-border))] rounded-[2rem] p-3 shadow-2xl">
                  {/* Notch */}
                  <div className="flex justify-center mb-2">
                    <div className="w-24 h-5 bg-background rounded-full" />
                  </div>

                  {/* Preview Content */}
                  <div className={`rounded-2xl overflow-hidden bg-background relative transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${aspectRatio === "square" ? "aspect-square" : "aspect-[9/16]"}`}>
                    <AnimatePresence mode="wait">
                      {isGenerating ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6"
                        >
                          <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-accent-violet/20" />
                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-violet animate-spin" />
                            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-accent-blue animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                          </div>
                          <div className="space-y-3 w-full max-w-[200px]">
                            {PIPELINE_STEPS.map((step, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0.3, x: -10 }}
                                animate={{
                                  opacity: i <= currentStep ? 1 : 0.3,
                                  x: 0,
                                }}
                                transition={{ delay: i * 0.15 }}
                                className="flex items-center gap-2.5 text-xs"
                              >
                                <span className="text-base">{step.icon}</span>
                                <span className={i <= currentStep ? "text-foreground" : "text-muted-foreground"}>
                                  {step.label}
                                </span>
                                {i < currentStep && <Check className="w-3.5 h-3.5 text-success ml-auto" />}
                                {i === currentStep && (
                                  <Loader2 className="w-3.5 h-3.5 text-accent-violet ml-auto animate-spin" />
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      ) : generatedImage ? (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="relative w-full h-full"
                        >
                          <img src={generatedImage} alt="Generated ad" className="w-full h-full object-cover" />
                          {/* Logo overlay */}
                          {logoPreview && (
                            <motion.img
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              src={logoPreview}
                              alt="Brand logo"
                              className={`absolute ${aspectRatio === "portrait" ? "bottom-12 right-6 w-20" : "bottom-6 right-6 w-16"} h-auto object-contain drop-shadow-2xl brightness-110 filter invert`}
                            />
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground"
                        >
                          <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: `${brandColor}15` }}
                          >
                            <ImageIcon className="w-8 h-8" style={{ color: brandColor }} />
                          </div>
                          <div className="text-center px-6">
                            <p className="text-sm font-medium text-foreground/60">Preview</p>
                            <p className="text-xs mt-1 opacity-50">Your generated ad will appear here</p>
                          </div>
                          {headlineText && (
                            <div
                              className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold text-center max-w-[80%]"
                              style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                            >
                              "{headlineText}"
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Bottom bar */}
                  <div className="flex justify-center gap-1.5 mt-3 mb-1">
                    <div className="w-28 h-1 bg-foreground/20 rounded-full" />
                  </div>
                </div>

                {/* Action Buttons (below phone) */}
                <AnimatePresence>
                  {generatedImage && !isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 space-y-3"
                    >
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="w-full bg-foreground text-background py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(255,255,255,0.4)]"
                      >
                        <Download className="w-4 h-4" />
                        Download {aspectRatio === "portrait" ? "Story Card" : "Marketing Post"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const p = (window as any)._lastGeneratedPrompt || "Premium commercial ad prompt not found.";
                          navigator.clipboard.writeText(p);
                          toast({
                            title: "Blueprint Copied",
                            description: "The technical AI prompt has been copied to your clipboard.",
                          });
                        }}
                        className="w-full bg-white/5 border border-white/5 text-muted-foreground py-2 rounded-xl text-[10px] uppercase tracking-[0.15em] font-bold hover:text-foreground hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-3 h-3" />
                        Copy AI Designer Blueprint
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={shareToWhatsApp}
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] text-white font-semibold text-xs transition-transform hover:scale-[1.02] shadow-lg shadow-[#25D366]/20"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-white" />
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={shareToInstagram}
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white font-semibold text-xs transition-transform hover:scale-[1.02] shadow-lg shadow-[#dc2743]/20"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          Instagram
                        </button>
                      </div>

                      {generatedCaption && (
                        <div className="bg-[hsl(var(--glass-bg))] border border-[hsl(var(--glass-border))] rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Generated Caption
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCaption}
                              className="text-xs text-accent-violet flex items-center gap-1 hover:underline"
                            >
                              {captionCopied ? (
                                <>
                                  <Check className="w-3 h-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed">{generatedCaption}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default BuilderSection;
