import { AboutCard } from "@/components/AboutCard";
import { BentoCard } from "@/components/BentoCard";
import { FunFacts } from "@/components/FunFacts";
import { MiniLesson } from "@/components/MiniLesson";
import { NotesTeaser } from "@/components/NotesTeaser";
import { QuantumTail } from "@/components/QuantumTail";
import { SkyTonight } from "@/components/SkyTonight";
import { Socials } from "@/components/Socials";
import { StatusCard } from "@/components/StatusCard";
import { WoofGamesTeaser } from "@/components/WoofGamesTeaser";

export default function Home() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <BentoCard label="About Hosky" className="lg:col-span-8">
          <AboutCard />
        </BentoCard>
        <BentoCard label="Status" className="lg:col-span-4">
          <StatusCard />
        </BentoCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <BentoCard label="Observatory" className="md:col-span-1 lg:col-span-5">
          <SkyTonight />
        </BentoCard>
        <BentoCard label="Curiosity drawer" className="md:col-span-1 lg:col-span-3">
          <FunFacts />
        </BentoCard>
        <BentoCard label="Classroom pocket" className="md:col-span-2 lg:col-span-4">
          <MiniLesson />
        </BentoCard>
      </div>

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
