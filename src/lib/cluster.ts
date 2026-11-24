import type {
  UseCase,
  Vergabe,
} from '../types';

// ── Pillar 3: Adjacencies, Blaupausen & Infrastruktur-Hubs ──
export interface ClusterSynergy {
  id: string;
  clusterName: string;
  sharedChallenge: string;
  blueprintUseCaseId: number | null;
  blueprintTitle: string;
  targetUseCaseIds: number[];
  benefitLabel: string;
}

export interface InfrastructureHub {
  id: string;
  name: string;
  shortName: string;
  role: string;
  bonusEffect: string;
  dockedUseCaseIds: number[];
}

export function computeClusterSynergies(usecases: UseCase[]): {
  synergies: ClusterSynergy[];
  hubs: InfrastructureHub[];
} {
  const findIds = (keywords: string[]) =>
    usecases
      .filter((u) => {
        const txt = `${u.unternehmen} ${u.titel} ${u.thema} ${u.branche}`.toLowerCase();
        return keywords.some((k) => txt.includes(k));
      })
      .map((u) => u.id);

  const heatIds = findIds(['wärme', 'abwärme', 'wasserstoff', 'dampf', 'speicher', 'energie']);
  const coatIds = findIds(['beschichtung', 'barriere', 'chitosan', 'spezialpapier', 'chatbot']);
  const visionIds = findIds(['gewebe', 'vlies', 'walzen', 'sensor', 'vision', 'recycling']);

  const pickBlueprint = (ids: number[]) => {
    const matched = usecases.filter((u) => ids.includes(u.id));
    const best = matched.find((u) => u.batch === 'Batch 1' || u.status === 'aktiv') || matched[0];
    return best || null;
  };

  const bHeat = pickBlueprint(heatIds);
  const bCoat = pickBlueprint(coatIds);
  const bVision = pickBlueprint(visionIds);

  const synergies: ClusterSynergy[] = [
    {
      id: 'syn-heat',
      clusterName: 'Cluster Prozesswärme & Energiespeicher',
      sharedChallenge: 'Dampf, Abwärmerückgewinnung & Lastspitzen-Steuerung (Schoellershammer · Metsä · AkzoNobel · Leitungspartner)',
      blueprintUseCaseId: bHeat?.id || null,
      blueprintTitle: bHeat ? `${bHeat.unternehmen} (${bHeat.startupPartner || bHeat.loesung})` : 'Energie-Blaupause',
      targetUseCaseIds: heatIds.filter((id) => id !== bHeat?.id),
      benefitLabel: '40 % schnellere Vergabe- & Lastenheft-Vorbereitung',
    },
    {
      id: 'syn-coat',
      clusterName: 'Cluster Spezialpapier & Biobasierte Barrieren',
      sharedChallenge: 'Kreislauffähige Beschichtungen & Schichtwissen (Sihl · Kanzan · Mondi)',
      blueprintUseCaseId: bCoat?.id || null,
      blueprintTitle: bCoat ? `${bCoat.unternehmen} (${bCoat.startupPartner || bCoat.loesung})` : 'Papier-Blaupause',
      targetUseCaseIds: coatIds.filter((id) => id !== bCoat?.id),
      benefitLabel: 'Transfer-Multiplikator BioökonomieREVIER + 40 % Checklisten-Vorsprung',
    },
    {
      id: 'syn-vision',
      clusterName: 'Cluster KI-Inspektion & Kreislauf-Fertigung',
      sharedChallenge: 'Inline-Sensorik, Robotik & Material-Recycling (GKD · Heimbach · Krafft · Neenah)',
      blueprintUseCaseId: bVision?.id || null,
      blueprintTitle: bVision ? `${bVision.unternehmen} (${bVision.startupPartner || bVision.loesung})` : 'KI-Blaupause',
      targetUseCaseIds: visionIds.filter((id) => id !== bVision?.id),
      benefitLabel: 'Geteilte Redeker-Vergabeblaupause & Sensorik-Standards',
    },
  ];

  const hubs: InfrastructureHub[] = [
    {
      id: 'hub-icd',
      name: 'Innovation Center Düren (ICD)',
      shortName: 'ICD Düren',
      role: 'KI-, Sensorik- & Startup-Transferhub',
      bonusEffect: '+15 % Matchmaking-Tempo für KI- & Digital-Piloten',
      dockedUseCaseIds: findIds(['ki', 'chatbot', 'vision', 'sensor', 'walzen']),
    },
    {
      id: 'hub-mfp',
      name: 'Modellfabrik Papier (MFP)',
      shortName: 'Modellfabrik Papier',
      role: 'Faser-, Trocknungs- & Wasserstoff-Testfeld',
      bonusEffect: 'Validiert Dekarbonisierungs-Reifegrad vor Vollanlage',
      dockedUseCaseIds: findIds(['papier', 'schoellershammer', 'metsä', 'kanzan', 'mondi', 'sihl']),
    },
    {
      id: 'hub-cospace',
      name: 'CO_SPACE.DN',
      shortName: 'CO_SPACE.DN',
      role: 'Design-Thinking- & Co-Creation-Bezirk',
      bonusEffect: 'Beschleunigt Batch-2/3-Konsortialworkshops & LoIs',
      dockedUseCaseIds: usecases.filter((u) => u.batch === 'Batch 2' || u.batch === 'Batch 3').map((u) => u.id),
    },
    {
      id: 'hub-kw66',
      name: 'Klassikwerk 66',
      shortName: 'Klassikwerk 66',
      role: 'Netzwerk- & Lenkungskreis-Forum (DN POWER UP)',
      bonusEffect: 'Erhöht politische Sichtbarkeit & Folgeantrag-Readiness',
      dockedUseCaseIds: usecases.filter((u) => u.politischeRelevanz >= 5).map((u) => u.id),
    },
  ];

  return { synergies, hubs };
}
