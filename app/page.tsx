import LeungRekHome from '@/components/LeungRekHome';
import { SpeedInsights } from "@vercel/speed-insights/next"

export default function Home() {
  return (
    <>
      <LeungRekHome />
      <SpeedInsights />
    </>
  );
}
