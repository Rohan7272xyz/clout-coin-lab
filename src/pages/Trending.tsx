import Header from "@/components/ui/header";
import TrendingSection from "@/components/ui/trending-section";
import Footer from "@/components/ui/footer";

const TrendingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <TrendingSection />
      </main>
      <Footer />
    </div>
  );
};

export default TrendingPage;
