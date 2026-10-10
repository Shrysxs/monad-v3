import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { LiveIntegrityView } from '@/components/views/LiveIntegrityView';
import { ReleaseDnaView } from '@/components/views/ReleaseDnaView';
import { RiskIntelligenceView } from '@/components/views/RiskIntelligenceView';
import { RegistryView } from '@/components/views/RegistryView';
import { VerifiedRelease } from '@/types/swarm';

interface WorkspaceContext {
  onInspectReleaseInDna: (release: VerifiedRelease) => void;
  selectedReleaseForDna: VerifiedRelease | null;
}

export function VerifyRoute() {
  const { onInspectReleaseInDna } = useOutletContext<WorkspaceContext>();
  return <LiveIntegrityView onInspectReleaseInDna={onInspectReleaseInDna} />;
}

export function ReleasesRoute() {
  const { selectedReleaseForDna } = useOutletContext<WorkspaceContext>();
  return <ReleaseDnaView initialSelectedRelease={selectedReleaseForDna} />;
}

export function RiskRoute() {
  return <RiskIntelligenceView />;
}

export function RegistryRoute() {
  const { onInspectReleaseInDna } = useOutletContext<WorkspaceContext>();
  return <RegistryView onSelectReleaseInDna={onInspectReleaseInDna} />;
}
