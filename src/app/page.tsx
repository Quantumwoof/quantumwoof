import dynamic from "next/dynamic";
import { homeMetadata } from "@/lib/page-metadata";
import { AboutCard } from "@/components/AboutCard";
import { BentoCard } from "@/components/BentoCard";
import { HomeCampusTeaser } from "@/components/HomeCampusTeaser";
import { InstallNudge } from "@/components/InstallNudge";
import { SkyFactBanner } from "@/components/SkyFactBanner";
import { SkyTonight } from "@/components/SkyTonight";

const Socials = dynamic(
  () => import("@/components/Socials").then((m) => m.Socials),
  { ssr: true },
);

export const metadata = homeMetadata;

export default function Home() {
  return (
    <div className="space-y-4">
      <SkyFactBanner />

      <BentoCard label="About Hosky">
        <AboutCard />
      </BentoCard>

      <BentoCard label="Observatory">
        <SkyTonight />
      </BentoCard>

      <BentoCard label="Campus">
        <HomeCampusTeaser />
      </BentoCard>

      <InstallNudge />

      <BentoCard label="Reach out">
        <Socials />
      </BentoCard>
    </div>
  );
}
