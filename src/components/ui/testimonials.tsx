import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      quote: "I backed @CryptoSarah before she hit 1M followers. My $50 investment is now worth $1,200. This platform is insane!",
      author: "CryptoWhale_99",
      return: "+2,340%",
      verified: true
    },
    {
      quote: "Publicly let me invest in people I actually believe in. Backed 3 creators early and all of them mooned. Best investment platform ever.",
      author: "DiamondHands2024",
      return: "+890%",
      verified: true
    },
    {
      quote: "Finally, a way to profit from my ability to spot viral content early. Made more here in 2 months than in stocks all year.",
      author: "TrendSpotter",
      return: "+456%",
      verified: true
    }
  ];

  return (
    <section className="py-20 bg-crypto-dark">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-black mb-4">
            Success <span className="text-primary">Stories</span>
          </h2>
          <p className="text-xl text-gray-light max-w-2xl mx-auto">
            Real investors, real profits. See how early believers are cashing in on clout.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-card border-border p-6 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-current" />
                ))}
              </div>
              
              <blockquote className="text-foreground mb-4 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground flex items-center">
                    @{testimonial.author}
                    {testimonial.verified && (
                      <div className="w-4 h-4 bg-primary rounded-full ml-2 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                      </div>
                    )}
                  </p>
                  <p className="text-sm text-gray-light">Verified Investor</p>
                </div>
                <div className="text-right">
                  <p className="text-primary font-bold">{testimonial.return}</p>
                  <p className="text-xs text-gray-light">Returns</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;