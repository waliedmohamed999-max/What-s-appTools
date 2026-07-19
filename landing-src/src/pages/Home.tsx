import Nav from '../components/Nav';
import Footer from '../components/Footer';
import WhatsAppFloatButton from '../components/WhatsAppFloatButton';
import Hero from '../components/home/Hero';
import StatsBar from '../components/home/StatsBar';
import ToolsSection from '../components/home/ToolsSection';
import HowItWorks from '../components/home/HowItWorks';
import WhyDms from '../components/home/WhyDms';
import ContactSection from '../components/home/ContactSection';

export default function Home() {
  return (
    <div className="bg-[#f0f0ee]">
      <Hero>
        <Nav />
      </Hero>

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
