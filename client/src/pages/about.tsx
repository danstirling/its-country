import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function About() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/country-band-stage.webp"
            alt="Country band performing at outdoor venue"
            className="w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1
            className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-4"
            data-testid="text-about-title"
          >
            The Story Behind It's Country
          </h1>
          <p className="text-white/95 text-lg max-w-xl mx-auto drop-shadow-[0_1px_6px_rgba(0,0,0,1)]">
            From the Texas desert to the stages of Nashville
          </p>
        </div>
      </section>

      {/* Section 1 — light cream */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto space-y-24">

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <img
              src="/images/texas-desert.webp"
              alt="Texas desert landscape"
              className="w-full rounded-xl object-cover h-[520px]"
              loading="eager"
            />
            <div>
              <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-about-heading-1">
                Born in the Desert
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                It's Country was founded on one belief: the best songs deserve the best voices.
                Out here, where the sky stretches wide and the silence tells its own story,
                we started collecting songs. Songwriters from across the country send us their finest
                work — ballads about love lost on dusty trails, anthems for Friday nights
                under desert stars, and everything in between.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="md:order-1 order-2">
              <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-about-heading-2">
                The Mission
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                <span className="font-bold text-foreground text-lg">We're not your typical record label. We're matchmakers.</span>
                {" "}Our catalog is full of songs written by gifted songwriters who pour their hearts
                onto the page but need a voice to carry those words to the world. We scout talent — raw,
                real, unpolished diamonds from the desert and beyond — and pair them with
                songs that fit like a well-worn pair of boots. When the right voice meets
                the right song, something magical happens.
              </p>
            </div>
            <img
              src="/images/country-singer-1.webp"
              alt="Country singer in cowboy hat"
              className="w-full rounded-xl object-cover h-[520px] md:order-2 order-1"
              loading="lazy"
            />
          </div>

        </div>
      </section>

      {/* Section 2 — warm sand */}
      <section className="py-20 px-4 bg-[hsl(35_35%_84%)]">
        <div className="max-w-5xl mx-auto space-y-24">

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <img
              src="/images/female-singer-2.webp"
              alt="Female country singer performing"
              className="w-full rounded-xl object-cover object-top h-[520px]"
              loading="lazy"
            />
            <div>
              <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-about-heading-3">
                The Sound
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                Our sound is the Texas desert itself — vast, warm, and full of quiet power.
                It's the crunch of boots on red dirt, the whisper of wind through mesquite,
                the golden glow of a sunset that paints the mesas in shades of amber and rust.
                We don't chase trends. We chase truth. And out here, where there's nothing
                between you and the horizon but honest air, truth is all there is.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="md:order-1 order-2">
              <h2 className="font-serif text-3xl font-bold mb-4" data-testid="text-about-heading-4">
                Looking Ahead
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                It's Country is just getting started. Like a desert sunrise, we're only
                beginning to show our colors. We're building a community of artists,
                songwriters, and music lovers who believe in the power of an honest song
                sung by the right voice. Whether you're a singer looking for your next hit,
                a writer looking for a home for your words, or a fan looking for something
                real — you've found your people. Welcome to It's Country.
              </p>
            </div>
            <img
              src="/images/male-singer-3.webp"
              alt="Country guitarist performing on stage"
              className="w-full rounded-xl object-cover object-[5%] h-[520px] md:order-2 order-1"
              loading="lazy"
            />
          </div>

        </div>
      </section>

      {/* CTA — deeper sand */}
      <section className="py-20 px-4 bg-[hsl(35_35%_68%)] text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
            Want to be part of it?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join a curated community of artists and songwriters. Apply for access to our exclusive catalog.
          </p>
          {!user && (
            <Link href="/register">
              <Button size="lg" data-testid="button-about-cta">
                Request Exclusive Access
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-[hsl(35_35%_56%)]">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          <div data-testid="stat-songs">
            <div className="font-serif text-4xl font-bold text-primary mb-2">20+</div>
            <div className="text-muted-foreground text-sm">Ready-to-Record Songs</div>
          </div>
          <div data-testid="stat-produced">
            <div className="font-serif text-4xl font-bold text-primary mb-2">100%</div>
            <div className="text-muted-foreground text-sm">Professionally Produced</div>
          </div>
          <div data-testid="stat-access">
            <div className="font-serif text-4xl font-bold text-primary mb-2">Texas</div>
            <div className="text-muted-foreground text-sm">Texas Born & Rooted</div>
          </div>
        </div>
      </section>

    </div>
  );
}
