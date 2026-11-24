import type {
  UseCase,
} from '../types';
import { formatDate } from './helpers';
import { PROFI_STARK_FKZ } from './money';

export interface UseCaseSteckbriefData {
  titel: string;
  partner: string;
  problemstellung: string;
  loesungsansatz: string;
  statusNextSteps: string;
  standortMehrwert: string;
}

export function getUseCaseSteckbrief(uc: UseCase): UseCaseSteckbriefData {
  const startup = uc.startupPartner || uc.loesung || 'In Matchmaking-Abstimmung';
  const partnerParts = [
    `Industrieunternehmen: ${uc.unternehmen || '–'}`,
    `Startup-/Lösungspartner: ${startup}`,
    uc.ansprechpartner ? `Ansprechpartner: ${uc.ansprechpartner}` : '',
  ].filter(Boolean);

  const openTodos = (uc.todos || []).filter((t) => !t.completed);
  const doneTodos = (uc.todos || []).filter((t) => t.completed);
  const defaultNextSteps =
    openTodos.length > 0
      ? `${uc.batch} · Status: ${uc.status} (${uc.reifegrad}). Offene Meilensteine: ${openTodos
          .map((t) => `${t.text}${t.dueDate ? ` (bis ${formatDate(t.dueDate)})` : ''}`)
          .join('; ')}.`
      : `${uc.batch} · Status: ${uc.status} (${uc.reifegrad}). ${doneTodos.length} Meilensteine abgeschlossen${uc.deadline ? `, Zieltermin ${formatDate(uc.deadline)}` : ''}.`;

  const defaultProblem =
    uc.risiken && uc.thema
      ? `Herausforderung im Handlungsfeld ${uc.thema} (${uc.branche}): ${uc.risiken}.`
      : uc.risiken || `Transformationsbedarf im Bereich ${uc.thema || uc.branche} am Standort Düren.`;

  const defaultSolution =
    uc.projektbeschreibung || uc.notizen || 'Pilotierung und technische Validierung gemeinsam mit dem Lösungspartner.';

  const defaultMehrwert = `Stärkung der regionalen Wertschöpfung im Cluster ${uc.branche} im Wirtschaftsraum Düren (Rheinisches Revier) durch Technologietransfer zwischen ${uc.unternehmen} und ${startup}.`;

  return {
    titel: uc.titel,
    partner: partnerParts.join(' | '),
    problemstellung: (uc.problemstellung || '').trim() || defaultProblem,
    loesungsansatz: (uc.loesungsansatz || '').trim() || defaultSolution,
    statusNextSteps: (uc.statusNextSteps || '').trim() || defaultNextSteps,
    standortMehrwert: (uc.standortMehrwert || '').trim() || defaultMehrwert,
  };
}

export function formatUseCaseSteckbriefPlainText(uc: UseCase): string {
  const s = getUseCaseSteckbrief(uc);
  return [
    `USE-CASE STECKBRIEF (${uc.batch} · FKZ ${PROFI_STARK_FKZ})`,
    `====================================================================`,
    `1. Titel: ${s.titel}`,
    `2. Partner: ${s.partner}`,
    `3. Problemstellung: ${s.problemstellung}`,
    `4. Lösungsansatz: ${s.loesungsansatz}`,
    `5. Status & Next Steps: ${s.statusNextSteps}`,
    `6. Standort-Mehrwert: ${s.standortMehrwert}`,
  ].join('\n');
}

export function formatUseCaseSteckbriefMarkdown(uc: UseCase): string {
  const s = getUseCaseSteckbrief(uc);
  return [
    `# Use-Case Steckbrief: ${s.titel}`,
    ``,
    `- **Projekt:** Zukunftsstoff – Made in Düren / MiD-PTC (FKZ \`${PROFI_STARK_FKZ}\`)`,
    `- **Batch / Branche:** ${uc.batch} · ${uc.branche} · Reifegrad: ${uc.reifegrad}`,
    ``,
    `## 1. Titel`,
    `${s.titel}`,
    ``,
    `## 2. Partner`,
    `${s.partner}`,
    ``,
    `## 3. Problemstellung`,
    `${s.problemstellung}`,
    ``,
    `## 4. Lösungsansatz`,
    `${s.loesungsansatz}`,
    ``,
    `## 5. Status & Next Steps`,
    `${s.statusNextSteps}`,
    ``,
    `## 6. Standort-Mehrwert`,
    `${s.standortMehrwert}`,
    ``,
  ].join('\n');
}

// Storage und Recovery keys
