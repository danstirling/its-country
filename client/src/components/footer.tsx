import { Link } from "wouter";
import { SiFacebook, SiLinkedin } from "react-icons/si";
import { Mail } from "lucide-react";

function CactusLineArt() {
  return (
    <svg
      viewBox="0 0 100 180"
      className="w-20 h-36 opacity-25 select-none pointer-events-none"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main trunk */}
      <path d="M44 175 C44 175 44 80 44 75 Q44 62 50 62 Q56 62 56 75 L56 175" />

      {/* Left arm — curves out then up */}
      <path d="M44 110 Q44 105 38 105 Q28 105 28 98 L28 72 Q28 62 34 62 Q40 62 40 72" />

      {/* Right arm — curves out then up */}
      <path d="M56 125 Q56 120 62 120 Q72 120 72 113 L72 88 Q72 78 66 78 Q60 78 60 88" />

      {/* Spines — trunk */}
      <line x1="44" y1="90" x2="38" y2="87" />
      <line x1="56" y1="95" x2="62" y2="92" />
      <line x1="44" y1="140" x2="38" y2="137" />
      <line x1="56" y1="145" x2="62" y2="142" />
      <line x1="44" y1="160" x2="38" y2="157" />
      <line x1="56" y1="165" x2="62" y2="162" />

      {/* Spines — left arm */}
      <line x1="28" y1="80" x2="23" y2="77" />
      <line x1="28" y1="90" x2="23" y2="93" />
      <line x1="34" y1="68" x2="31" y2="62" />

      {/* Spines — right arm */}
      <line x1="72" y1="96" x2="77" y2="93" />
      <line x1="72" y1="106" x2="77" y2="109" />
      <line x1="66" y1="84" x2="69" y2="78" />

      {/* Ground line */}
      <line x1="28" y1="175" x2="72" y2="175" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-[hsl(35_35%_36%)] text-white/90 relative">

      {/* Decorative cactus — bottom right, hidden on very small screens */}
      <div className="hidden sm:flex absolute bottom-0 right-6 items-end pointer-events-none select-none">
        <CactusLineArt />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

        {/* Main footer layout — flex on mobile (text left, cactus right), grid on sm+ */}
        <div className="flex gap-6 mb-10 sm:gap-0">

          {/* Text columns */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-10">

          {/* Column 1 — Logo + social */}
          <div className="flex flex-col items-start gap-5">
            <img src="/images/logo.png" alt="It's Country" className="h-12 w-auto [filter:brightness(0.72)_saturate(1.4)]" />
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/dan.stirling.2025"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-white/60 hover:text-white transition-colors"
                data-testid="link-footer-facebook"
              >
                <SiFacebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/dan-stirling-2508091/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-white/60 hover:text-white transition-colors"
                data-testid="link-footer-linkedin"
              >
                <SiLinkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Column 2 — Nav links */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-4 font-semibold">Navigate</p>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm" data-testid="link-footer-home">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/80 hover:text-white transition-colors text-sm" data-testid="link-footer-about">
                  About
                </Link>
              </li>
              <li>
                <Link href="/artists" className="text-white/80 hover:text-white transition-colors text-sm" data-testid="link-footer-songwriters">
                  Songwriters
                </Link>
              </li>
              <li>
                <Link href="/songs" className="text-white/80 hover:text-white transition-colors text-sm" data-testid="link-footer-songs">
                  Songs
                </Link>
              </li>
              <li>
                <a href="/#faq" className="text-white/80 hover:text-white transition-colors text-sm" data-testid="link-footer-faq">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 — Contact */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-4 font-semibold">Contact</p>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:Info@Its-Country.com"
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
                  data-testid="link-footer-email"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  Info@Its-Country.com
                </a>
              </li>
            </ul>
          </div>

          </div>{/* end text columns grid */}

          {/* Cactus — mobile only, right side beside nav/contact */}
          <div className="flex sm:hidden items-center justify-center pointer-events-none select-none shrink-0">
            <CactusLineArt />
          </div>

        </div>{/* end outer flex */}

        {/* Divider */}
        <div className="border-t border-white/20 mb-6" />

        {/* Legal + copyright */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-white/50">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href="/privacy" className="hover:text-white/80 transition-colors" data-testid="link-footer-privacy">
              Privacy Policy
            </a>
            <span className="hidden sm:inline text-white/25">|</span>
            <a href="/terms" className="hover:text-white/80 transition-colors" data-testid="link-footer-terms">
              Terms &amp; Conditions
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-right">
            <p data-testid="text-footer-copyright">
              &copy; {new Date().getFullYear()} It's Country &nbsp;|&nbsp; All Rights Reserved
            </p>
            <p>
              Website created and maintained by{" "}
              <a
                href="https://kizmetdigital.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white/80 transition-colors"
                data-testid="link-footer-kizmet"
              >
                Kizmet Digital
              </a>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}
