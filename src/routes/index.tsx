import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, type TabKey } from "@/components/mind/Shell";
import { DashboardView } from "@/components/mind/Dashboard";
import { ActivitiesView } from "@/components/mind/Activities";
import { AnnualView } from "@/components/mind/Annual";
import { FinancesView } from "@/components/mind/Finances";
import { HistoryView } from "@/components/mind/History";
import { RoadmapView } from "@/components/mind/Roadmap";
import { GuideView } from "@/components/mind/Guide";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mind Tracker — Tableau de bord personnel & financier" },
      { name: "description", content: "Mind Tracker : suivez vos activités quotidiennes, finances mensuelles et roadmap MGS dans une interface unifiée." },
      { property: "og:title", content: "Mind Tracker" },
      { property: "og:description", content: "Suivi quotidien, finances et roadmap — Mind Graphix Solution." },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  return (
    <Shell tab={tab} onTab={setTab}>
      {tab === "dashboard"  && <DashboardView goto={setTab} />}
      {tab === "activities" && <ActivitiesView />}
      {tab === "annual"     && <AnnualView />}
      {tab === "finances"   && <FinancesView />}
      {tab === "history"    && <HistoryView />}
      {tab === "roadmap"    && <RoadmapView />}
      {tab === "guide"      && <GuideView />}
    </Shell>
  );
}
