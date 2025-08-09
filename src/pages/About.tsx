// src/pages/About.tsx
import Header from '@/components/ui/header';
import Footer from '@/components/ui/footer';

const About = () => (
  <div className="min-h-screen flex flex-col bg-black text-white">
    <Header />
    <main className="flex-1 flex flex-col items-center justify-center py-20 px-6">
      <h1 className="text-4xl font-bold mb-6">About CoinFluence</h1>
      <p className="max-w-xl text-center text-lg text-gray-300 mb-8">
        CoinFluence is a platform where you can back trending influencers with crypto coins, trade clout, and profit publicly. Our mission is to empower creators and investors to connect in a transparent, innovative, and rewarding way.<br /><br />
        <span className="text-gray-400">[This is placeholder content. Replace with real info soon!]</span>
      </p>
    </main>
    <Footer />
  </div>
);

export default About;
