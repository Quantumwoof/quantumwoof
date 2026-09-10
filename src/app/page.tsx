import { AboutCard } from "@/components/AboutCard";
import { BentoCard } from "@/components/BentoCard";
import { FunFacts } from "@/components/FunFacts";
import { MiniLesson } from "@/components/MiniLesson";
import { NotesTeaser } from "@/components/NotesTeaser";
import { QuantumTail } from "@/components/QuantumTail";
import { SkyFactBanner } from "@/components/SkyFactBanner";
import { SkyTonight } from "@/components/SkyTonight";
import { Socials } from "@/components/Socials";
import { StatusCard } from "@/components/StatusCard";
import { WoofGamesTeaser } from "@/components/WoofGamesTeaser";

export default function Home() {
  return (
    <div className="space-y-4">
      {/* High sky — facts float near header / cloud layer */}
      <SkyFactBanner />

      <div className="grid gap-4 lg:grid-cols-12">
        <BentoCard label="About Hosky" className="lg:col-span-8">
          <AboutCard />
        </BentoCard>
        <BentoCard label="Status" className="lg:col-span-4">
          <StatusCard />
        </BentoCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <BentoCard label="Observatory" className="md:col-span-1 lg:col-span-7">
          <SkyTonight />
        </BentoCard>
        <BentoCard label="Classroom pocket" className="md:col-span-1 lg:col-span-5">
          <MiniLesson />
        </BentoCard>
      </div>

      <BentoCard label="Curiosity drawer">
        <FunFacts />
      </BentoCard>

      <BentoCard label="Field notes">
        <NotesTeaser />
      </BentoCard>

      <BentoCard label="Play">
        <WoofGamesTeaser />
      </BentoCard>

      <div className="grid gap-4 md:grid-cols-2">
        <BentoCard label="Reach out">
          <Socials />
        </BentoCard>
        <BentoCard label="Playful widget">
          <QuantumTail />
        </BentoCard>
      </div>
    </div>
  );
}
