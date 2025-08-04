import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/ui/header";
import { Mail, Github, Apple, Chrome } from "lucide-react";
import { sendMagicLink } from "@/lib/auth/emailLink";

function PasswordField() {
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
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
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendMagicLink(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send sign-in email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-foreground">
      <Header />
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center group transition-shadow duration-300 mb-2 hover:shadow-[0_0_16px_2px_rgba(34,197,94,0.5)]">
          <span className="text-primary-foreground font-bold text-2xl">P</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Sign in</h1>
      </div>
      <div className="bg-background/90 border border-white/10 rounded-xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-5 backdrop-blur-md">
        <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3">
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
          <PasswordField />
          <Button
            type="submit"
            className="mt-2 w-full font-bold bg-[#181a1b] border border-primary/40 text-white hover:border-primary/80 hover:shadow-green-500/20 transition-all duration-200"
            disabled={loading || sent}
          >
            {sent ? "Check your email" : loading ? "Sending..." : "Continue"}
          </Button>
          {error && <div className="text-destructive text-xs mt-1">{error}</div>}
        </form>
        <div className="flex items-center gap-2 my-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-gray-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <Button
          type="button"
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              const { signInWithGoogle } = await import("@/lib/auth/google");
              await signInWithGoogle();
              navigate("/");
            } catch (err: any) {
              setError(err.message || "Google sign-in failed.");
            } finally {
              setLoading(false);
            }
          }}
          className="w-full flex items-center gap-2 justify-center bg-[#181a1b] border border-primary/40 text-white hover:border-primary/80 hover:shadow-green-500/20 transition-all duration-200"
          disabled={loading}
        >
          <Chrome className="w-4 h-4 text-primary" /> Continue with Google
        </Button>
        <div className="text-xs text-center mt-2 text-gray-muted">
          Don’t have an account? <a href="#" className="text-primary hover:underline">Sign up</a>
        </div>
      </div>
      <div className="mt-8 text-xs text-gray-muted text-center">
        <a href="#" className="hover:underline">Terms of Service</a> and <a href="#" className="hover:underline">Privacy Policy</a>
      </div>
      </div>
    </div>
  );
}
