import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold">Publicly</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#trending" className="text-gray-light hover:text-foreground transition-colors">
            Trending
          </a>
          <a href="#how-it-works" className="text-gray-light hover:text-foreground transition-colors">
            How it Works
          </a>
          <a href="#about" className="text-gray-light hover:text-foreground transition-colors">
            About
          </a>
        </nav>
        
        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground neon-glow">
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
      </div>
    </header>
  );
};

export default Header;