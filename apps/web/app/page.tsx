import { NavigationIridescent } from '../components/navigation/NavigationIridescent';
import { HeroIridescent } from '../components/sections/HeroIridescent';
import { WhyItFailsIridescent } from '../components/sections/WhyItFailsIridescent';
import { AIInsideGridSection } from '../components/sections/AIInsideGridSection';
import { HowItWorksIridescent } from '../components/sections/HowItWorksIridescent';
import { PowerUsersSection } from '../components/sections/PowerUsersSection';
import { OpenSourceIridescent } from '../components/sections/OpenSourceIridescent';
import { CTAIridescent } from '../components/sections/CTAIridescent';
import { FooterIridescent } from '../components/footer/FooterIridescent';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-visible selection:bg-accent-blue/20 selection:text-accent-blue bg-white text-text-main antialiased">
      <NavigationIridescent />
      <div className="max-w-[1280px] mx-auto px-8 pt-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Server is under maintenance. Login is temporarily disabled.
        </div>
      </div>
      <HeroIridescent />
      <WhyItFailsIridescent />
      <AIInsideGridSection />
      <HowItWorksIridescent />
      <PowerUsersSection />
      <OpenSourceIridescent />
      <CTAIridescent />
      <FooterIridescent />
    </main>
  );
}
