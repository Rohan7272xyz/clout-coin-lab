// src/pages/SignIn.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/ui/header";
import { Chrome } from "lucide-react";
import { sendMagicLink, completeMagicLinkSignIn, isMagicLink } from "@/lib/auth/emailLink";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth/email";
import { signInWithGoogle } from "@/lib/auth/google";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/hooks/use-toast";

function PasswordField({ 
  password, 
  setPassword 
}: { 
  password: string; 
  setPassword: (value: string) => void; 
}) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative flex flex-col">
      <label htmlFor="password" className="text-sm font-medium text-white mb-3">Password</label>
      <div className="relative">
        <Input
          id="password"
          type={show ? "text" : "password"}
          placeholder="Your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="border border-white/20 bg-background text-foreground placeholder:text-gray-400 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/60 focus-visible:shadow-green-500/10 pr-14"
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400 hover:text-primary transition-colors"
          onClick={() => setShow(s => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check if this is a magic link callback when component loads
  useEffect(() => {
    if (isMagicLink()) {
      handleMagicLinkSignIn();
    }
  }, []);

  const handleMagicLinkSignIn = async () => {
    setLoading(true);
    try {
      await completeMagicLinkSignIn();
      toast({
        title: "Signed in successfully!",
        description: "Welcome to the platform.",
      });
      
      // Refresh user data and navigate
      await refreshUser();
      navigate("/");
    } catch (err: any) {
      console.error("Magic link sign-in error:", err);
      toast({
        title: "Magic link sign-in failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (useMagicLink) {
        await sendMagicLink(email);
        setMagicLinkSent(true);
        toast({
          title: "Magic link sent!",
          description: "Check your email for the sign-in link.",
        });
      } else {
        if (isSignUp) {
          await signUpWithEmail(email, password);
          toast({
            title: "Account created!",
            description: "Welcome to the platform.",
          });
        } else {
          await signInWithEmail(email, password);
          toast({
            title: "Signed in successfully!",
            description: "Welcome back.",
          });
        }
        
        // Refresh user data and navigate
        await refreshUser();
        navigate("/");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      toast({
        title: "Authentication failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Signed in with Google!",
        description: "Welcome to the platform.",
      });
      
      // Refresh user data and navigate
      await refreshUser();
      navigate("/");
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      toast({
        title: "Google sign-in failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-foreground">
      <Header />
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="flex flex-col items-center mb-6">
          {/* Updated logo section to match header */}
          <div className="group transition-all duration-300 hover:scale-105">
            <img
              src="/20250805_1007_Modern Coinfluence Logo_simple_compose_01k1x8x0hheaaraepnewcd4d46.png"
              alt="CoinFluence Logo"
              className="relative top-4 w-28 h-28 object-contain drop-shadow-md transition-all duration-300 group-hover:drop-shadow-[0_0_16px_rgba(34,197,94,0.5)]"
              style={{ 
                imageRendering: 'crisp-edges',
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
        </div>
        
        <div className="bg-background/90 border border-white/10 rounded-xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-5 backdrop-blur-md">
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
            <label htmlFor="email" className="text-sm font-medium text-white">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="border border-white/20 bg-background text-foreground placeholder:text-gray-400 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/60 focus-visible:shadow-green-500/10"
            />
            
            {!useMagicLink && (
              <PasswordField password={password} setPassword={setPassword} />
            )}
            
            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="magic-link"
                checked={useMagicLink}
                onChange={(e) => setUseMagicLink(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="magic-link" className="text-gray-400">
                Use magic link (no password required)
              </label>
            </div>
            
            <Button
              type="submit"
              className="mt-2 w-full font-bold bg-[#181a1b] border border-primary/40 text-white hover:border-primary/80 hover:shadow-green-500/20 transition-all duration-200"
              disabled={loading || magicLinkSent}
            >
              {magicLinkSent ? "Check your email" : 
               loading ? "Processing..." : 
               useMagicLink ? "Send Magic Link" :
               isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
          
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-gray-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center gap-2 justify-center bg-[#181a1b] border border-primary/40 text-white hover:border-primary/80 hover:shadow-green-500/20 transition-all duration-200"
            disabled={loading}
          >
            <Chrome className="w-4 h-4 text-primary" /> Continue with Google
          </Button>
          
          <div className="text-xs text-center mt-2 text-gray-muted">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-xs text-gray-muted text-center">
          <a href="#" className="hover:underline">Terms of Service</a> and{" "}
          <a href="#" className="hover:underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}