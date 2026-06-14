import { Panel } from "./ui";

export function GuideView() {
  return (
    <div className="space-y-6">
      <Panel title="🧭 Tracker Activités — Mode d'emploi">
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>• <span className="text-foreground">Heure de réveil</span> : saisie libre (ex : 06:30).</li>
          <li>• <span className="text-foreground">Activités</span> : cocher une case = 1 point.</li>
          <li>• <span className="text-foreground">Score quotidien</span> : sur 11 maximum, % calculé automatiquement.</li>
          <li>• <span className="text-foreground">Synthèse annuelle</span> : agrège tous les mois saisis pour l'année.</li>
          <li>• <span className="text-foreground">Objectif</span> : maintenir un score &gt; 8/11 pour bâtir les fondations de MGS.</li>
        </ul>
      </Panel>

      <Panel title="💰 Finances — Légende & règles">
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>• <span className="text-foreground">Budget Prévu</span> : ce que vous planifiez en début de mois.</li>
          <li>• <span className="text-foreground">Réel Dépensé</span> : ce qui a effectivement été dépensé.</li>
          <li>• <span className="text-[color:var(--success)]">Écart négatif</span> = sous le budget (bon). <span className="text-destructive">Écart positif</span> = dépassement.</li>
          <li>• <span className="text-foreground">Taux d'épargne</span> = Épargne / Revenus réels. Objectif : &gt; 20%.</li>
          <li>• <span className="text-foreground">Ratio essentielles</span> = Essentielles / Revenus. Cible : &lt; 60%.</li>
        </ul>
      </Panel>

      <Panel title="🚀 Vision Mind Graphix Solution">
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>Construire en parallèle de l'emploi salarié un studio digital indépendant, rentable et reconnu, capable de devenir source de revenu principale.</p>
          <p>Discipline quotidienne + rigueur financière + roadmap claire = transition réussie.</p>
        </div>
      </Panel>

      <Panel title="🔐 Confidentialité">
        <p className="text-sm text-muted-foreground">Toutes vos données restent dans votre navigateur (localStorage). Aucun envoi sur un serveur. Sauvegardez régulièrement en exportant via les outils du navigateur si besoin.</p>
      </Panel>
    </div>
  );
}