import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/ui/header";
import HeroSection from "@/components/ui/hero-section";

import HowItWorks from "@/components/ui/how-it-works";
import Testimonials from "@/components/ui/testimonials";
import Footer from "@/components/ui/footer";

const Index = () => {
  const location = useLocation();
  useEffect(() => {
    const scrollToHash = () => {
      if (window.location.hash) {
        const el = document.querySelector(window.location.hash);
        if (el) {
          // Adjust for sticky header height
          const header = document.querySelector('header');
          const headerHeight = header ? header.offsetHeight : 0;
          const elementTop = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: elementTop - headerHeight - 24, // 24px extra for spacing
            behavior: "smooth"
          });
        }
      }
    };
    scrollToHash(); // On mount or hash change
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [location.hash]);

  return (
    <div className="rrelative bg-background min-h-screen">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
        id="homepage-bg-video"
      >
        {/* Drop your video file in public/bg.mp4 or change src as needed */}
        <source src="/20250803_2337_Futuristic Data Pulsation_remix_01k1sjggacf909qnyegc5xgpz4.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Overlay for darkening video if needed */}
      <div className="fixed inset-0 bg-black/90 z-10 pointer-events-none" />
      <div className="relative z-20">
        <Header />
        <main>
          <HeroSection />
          <HowItWorks />
          {/* <Testimonials />  // Success Stories section hashed out as requested */}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;