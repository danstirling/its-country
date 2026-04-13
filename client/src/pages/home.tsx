import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Star, Users, Mic2, ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does It's Country work?",
    a: "We connect professionally written country songs with artists looking for their next release. Once you're approved, you can explore the catalog and stream songs directly on the platform.",
  },
  {
    q: "Do I need an account to access the site?",
    a: "Yes. Access to the platform requires an approved account. Once approved, you'll be able to browse the catalog and stream available songs.",
  },
  {
    q: "Can I stream songs with my account?",
    a: "Yes. All approved members can stream songs directly within the platform. Songs are available for listening only — no downloads are offered.",
  },
  {
    q: "How do I request access to a specific song?",
    a: "If you're interested in a song, reach out directly to the It's Country team at info@its-country.com. They'll guide you through the next steps.",
  },
  {
    q: "Are the songs exclusive?",
    a: "Our catalog is curated and controlled. Some songs may be exclusive, while others have specific licensing terms depending on the track.",
  },
  {
    q: "Is there a cost to join?",
    a: "There is no cost to request access or browse the platform. Licensing details are handled directly with the It's Country team.",
  },
  {
    q: "What happens after I find a song I love?",
    a: "Email info@its-country.com to let us know. The It's Country team will walk you through the licensing process and next steps for bringing that song to life.",
  },
  {
    q: "What makes It's Country different?",
    a: "We focus on quality over quantity. Every song is professionally written and selected to ensure it's ready for the right artist to bring it to life.",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <section id="hero-section" className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-desert.webp"
            alt="Texas desert landscape"
            fetchPriority="high"
            className="w-full h-full object-cover object-[center_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <h1
            className="font-serif text-5xl sm:text-6xl md:text-[5rem] font-bold text-[#FFD700] mb-6 leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
            data-testid="text-hero-title"
          >
            Songs Written. Voices Wanted.
          </h1>
          <p className="text-lg sm:text-xl text-white mb-6 max-w-2xl mx-auto font-light drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            Professionally written country songs with demo vocals.<br />Access available to approved members only.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link href="/artists">
                <Button size="lg" data-testid="button-browse-artists">
                  Browse Songwriters
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg" className="text-base px-6 py-2 shadow-[0_0_28px_rgba(138,16,26,0.70)] hover:shadow-[0_0_36px_rgba(138,16,26,0.90)] transition-shadow" data-testid="button-join-now">
                  Request Exclusive Access
                </Button>
              </Link>
            )}
          </div>
          {!user && (
            <p className="text-white/90 text-sm font-light mt-6 drop-shadow-[0_1px_6px_rgba(0,0,0,1)]">
              Apply for access to a curated catalog of ready-to-record songs.
            </p>
          )}
        </div>
      </section>

      {/* What We Do */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4" data-testid="text-what-we-do">
            What We Do
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Every great song deserves the right voice. We connect professionally written country songs with artists ready to bring them to life.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Mic2 className="h-8 w-8" />}
              title="Ready-to-Record Songs"
              description="Our catalog features professionally written songs ready for recording—crafted by experienced songwriters and waiting for the right voice."
              image="/images/songwriting.png"
              imageFit="object-cover"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Discover Songwriters"
              description="We connect our songs with artists who bring authenticity and talent to every track. Every voice has a story—we help you find yours."
              image="/images/connect-artists.png"
              imageFit="object-cover"
            />
            <FeatureCard
              icon={<Star className="h-8 w-8" />}
              title="Desert Soul Sound"
              description="Rooted in the wide-open spaces of Texas, our sound is honest, powerful, and unmistakably country."
              image="/images/desert-sound.png"
              imageFit="object-cover"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-[hsl(35_35%_84%)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Everything you need to know about It's Country.
          </p>
          <FaqAccordion />
        </div>
      </section>

      {/* Ready to Ride CTA */}
      <section id="cta-section" className="py-20 px-4 bg-[hsl(35_35%_68%)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6" data-testid="text-cta-title">
            Request Exclusive Access
          </h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-lg">
            Join a curated community of country artists and songwriters. Apply for access to our exclusive catalog of ready-to-record songs.
          </p>
          {!user && (
            <Link href="/register">
              <Button size="lg" data-testid="button-cta-join">
                Request Exclusive Access
              </Button>
            </Link>
          )}
        </div>
      </section>

    </div>
  );
}

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div key={i} className="bg-card border border-border rounded-md" data-testid={`faq-item-${i}`}>
          <button
            className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            data-testid={`faq-trigger-${i}`}
          >
            <span className="font-serif text-base font-semibold">{faq.q}</span>
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-muted-foreground leading-relaxed text-sm">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ icon, title, description, image, imageFit = "object-contain" }: { icon: React.ReactNode; title: string; description: string; image?: string; imageFit?: string }) {
  return (
    <div className="rounded-md bg-card border border-border overflow-hidden" data-testid={`card-feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {image && (
        <div className="h-64 overflow-hidden bg-card">
          <img src={image} alt={title} className={`w-full h-full ${imageFit}`} />
        </div>
      )}
      <div className="text-center p-8">
        {!image && (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-primary/10 text-primary mb-5">
            {icon}
          </div>
        )}
        <h3 className="font-serif text-xl font-semibold mb-3">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
