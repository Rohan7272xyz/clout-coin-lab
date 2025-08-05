import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/lib/auth/auth-context";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-center">
        <div className="flex items-center gap-x-14 mx-auto">

        <a href="/" className="flex items-center space-x-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
          <span className="text-xl font-bold group-hover:underline">CoinFluence</span>
        </a>
        
        <nav className="hidden md:flex items-center space-x-12">
          <Link to="/trending" className="text-gray-light hover:text-foreground transition-colors">
            Trending
          </Link>
          <Link to="/#how-it-works" className="text-gray-light hover:text-foreground transition-colors">
            How it Works
          </Link>
          <Link to="/#about" className="text-gray-light hover:text-foreground transition-colors">
            About
          </Link>
        </nav>
        
        <div className="flex items-center gap-6">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button
                variant="wallet"
                size="lg"
                className="px-6 py-2 font-semibold"
                onClick={openConnectModal}
              >
                <Zap className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            )}
          </ConnectButton.Custom>
          <Button
            variant="outline"
            size="lg"
            className="px-6 py-2 font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground neon-glow"
            asChild
          >
            <a href="/signin">Sign In</a>
          </Button>
        </div>
      </div>
      </div>
    </header>
  );
};

export default Header;