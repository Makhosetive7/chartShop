import { HeroSection } from '@/components/marketing/HeroSection';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { SolutionSection } from '@/components/marketing/SolutionSection';
import { UseCasesSection } from '@/components/marketing/UseCasesSection';
import { ChannelsSection } from '@/components/marketing/ChannelsSection';
import { AboutSection } from '@/components/marketing/AboutSection';
import { TrustSection } from '@/components/marketing/TrustSection';
import { ClosingSection } from '@/components/marketing/ClosingSection';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <UseCasesSection />
      <ChannelsSection />
      <AboutSection />
      <TrustSection />
      <ClosingSection />
    </>
  );
}
