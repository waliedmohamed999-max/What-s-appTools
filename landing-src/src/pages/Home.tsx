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

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[5%] -start-24 w-[26rem] h-[26rem] rounded-full bg-[rgba(var(--primary-rgb),0.12)] blur-3xl animate-blob" />
          <div
            className="absolute top-[45%] -end-32 w-[24rem] h-[24rem] rounded-full bg-[rgba(var(--accent-rgb),0.1)] blur-3xl animate-blob"
            style={{ animationDelay: '-8s' }}
          />
          <div
            className="absolute bottom-[5%] start-[10%] w-[22rem] h-[22rem] rounded-full bg-[rgba(var(--primary-rgb),0.1)] blur-3xl animate-blob"
            style={{ animationDelay: '-14s' }}
          />
        </div>

        <div className="relative z-10">
          <PlatformMarquee />
          <StatsBar />
          <ToolsSection />
          <HowItWorks />
          <WhyDms />
          <ContactSection />
        </div>
      </div>

      <Footer />
      <WhatsAppFloatButton />
    </div>
  );
}
