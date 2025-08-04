import { MessageCircle, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold">Publicly</span>
            </div>
            <p className="text-gray-light mb-4 max-w-md">
              The first platform to let you invest in people. Back trending influencers with meme coins and profit from their success.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 bg-crypto-dark border border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-gray-light hover:text-primary" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-crypto-dark border border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors"
              >
                <Twitter className="w-5 h-5 text-gray-light hover:text-primary" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">Browse Coins</a></li>
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">How it Works</a></li>
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">For Influencers</a></li>
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">Marketplace</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">Risk Disclosure</a></li>
              <li><a href="#" className="text-gray-light hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-light text-sm">
            © 2024 Publicly. All rights reserved. Invest responsibly.
          </p>
          <p className="text-gray-light text-xs mt-2 md:mt-0">
            Not financial advice. Crypto investments are high risk.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;