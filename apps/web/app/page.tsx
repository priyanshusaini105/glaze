import { NavigationIridescent } from '../components/NavigationIridescent';
import { HeroIridescent } from '../components/HeroIridescent';
import { WhyItFailsIridescent } from '../components/WhyItFailsIridescent';
import { AIInsideGridSection } from '../components/AIInsideGridSection';
import { HowItWorksIridescent } from '../components/HowItWorksIridescent';
import { PowerUsersSection } from '../components/PowerUsersSection';
import { OpenSourceIridescent } from '../components/OpenSourceIridescent';
import { FooterIridescent } from '../components/FooterIridescent';

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
