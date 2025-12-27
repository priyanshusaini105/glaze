import { NavigationIridescent } from '../components/navigation/NavigationIridescent';
import { HeroIridescent } from '../components/sections/HeroIridescent';
import { WhyItFailsIridescent } from '../components/sections/WhyItFailsIridescent';
import { AIInsideGridSection } from '../components/sections/AIInsideGridSection';
import { HowItWorksIridescent } from '../components/sections/HowItWorksIridescent';
import { PowerUsersSection } from '../components/sections/PowerUsersSection';
import { OpenSourceIridescent } from '../components/sections/OpenSourceIridescent';
import { FooterIridescent } from '../components/footer/FooterIridescent';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden selection:bg-accent-blue/20 selection:text-accent-blue bg-white text-text-main antialiased">
      <NavigationIridescent />
      <HeroIridescent />
      <WhyItFailsIridescent />
      <AIInsideGridSection />
      <HowItWorksIridescent />
      <PowerUsersSection />
      <OpenSourceIridescent />
      <FooterIridescent />
    </main>
  );
}
