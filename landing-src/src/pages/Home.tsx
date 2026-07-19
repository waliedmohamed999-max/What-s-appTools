import Nav from '../components/Nav';
import Footer from '../components/Footer';
import WhatsAppFloatButton from '../components/WhatsAppFloatButton';
import Hero from '../components/home/Hero';
import PlatformMarquee from '../components/home/PlatformMarquee';
import StatsBar from '../components/home/StatsBar';
import ToolsSection from '../components/home/ToolsSection';
import HowItWorks from '../components/home/HowItWorks';
import WhyDms from '../components/home/WhyDms';
import ContactSection from '../components/home/ContactSection';

export default function Home() {
  return (
    <div className="bg-[var(--bg)]">
      <Hero>
        <Nav />
      </Hero>

      <div className="relative">
        {/* Fixed (not absolute) so these stay in the viewport as the page scrolls —
            every glass-panel/glass-chip below needs a colorful backdrop to blur,
            not just whichever section happens to sit near the blobs. */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute top-[8%] -start-20 w-[26rem] h-[26rem] rounded-full bg-[rgba(var(--primary-rgb),0.22)] blur-3xl animate-blob" />
          <div
            className="absolute top-1/2 -end-24 w-[24rem] h-[24rem] rounded-full bg-[rgba(var(--accent-rgb),0.18)] blur-3xl animate-blob"
            style={{ animationDelay: '-8s' }}
          />
          <div
            className="absolute bottom-[6%] start-[15%] w-[22rem] h-[22rem] rounded-full bg-[rgba(var(--primary-rgb),0.18)] blur-3xl animate-blob"
            style={{ animationDelay: '-14s' }}
          />
        </div>

        <PlatformMarquee />
        <StatsBar />
        <ToolsSection />
        <HowItWorks />
        <WhyDms />
        <ContactSection />
      </div>

      <Footer />
      <WhatsAppFloatButton />
    </div>
  );
}
