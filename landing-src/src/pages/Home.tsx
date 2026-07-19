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

      <PlatformMarquee />
      <StatsBar />
      <ToolsSection />
      <HowItWorks />
      <WhyDms />
      <ContactSection />

      <Footer />
      <WhatsAppFloatButton />
    </div>
  );
}
