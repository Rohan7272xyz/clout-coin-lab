import Header from "@/components/ui/header";
import HeroSection from "@/components/ui/hero-section";
import TrendingSection from "@/components/ui/trending-section";
import HowItWorks from "@/components/ui/how-it-works";
import Testimonials from "@/components/ui/testimonials";
import Footer from "@/components/ui/footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <TrendingSection />
        <HowItWorks />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
};

export default Index;