import { useNavigate } from "react-router-dom";

interface NavbarProps {
  onScrollToBuilder: () => void;
}

const Navbar = ({ onScrollToBuilder }: NavbarProps) => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full px-6 md:px-12 py-6 flex justify-between items-center z-[100] backdrop-blur-[10px]">
      <div className="flex items-center gap-3 font-heading font-bold text-lg tracking-tight">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>AdGen</span>
      </div>

      <div className="hidden md:flex gap-8">
        <a href="#" className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors duration-300">Platform</a>
        <a href="#" className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors duration-300">Solutions</a>
        <a href="#" className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors duration-300">Pricing</a>
      </div>

      <button
        onClick={onScrollToBuilder}
        className="bg-primary text-primary-foreground py-2 px-6 rounded-full font-medium text-[13px] border border-primary/20 cursor-pointer inline-flex items-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95"
      >
        Create Ad
      </button>
    </nav>
  );
};

export default Navbar;
