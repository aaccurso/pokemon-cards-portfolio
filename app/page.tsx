import { Suspense } from "react";
import PortfolioTracker from "@/components/PortfolioTracker";

export default function Home() {
  return (
    <Suspense>
      <PortfolioTracker />
    </Suspense>
  );
}
