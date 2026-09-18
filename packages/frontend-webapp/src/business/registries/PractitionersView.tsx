import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const PractitionersView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="REGISTRIES_PRACTITIONERS"
      icon="🩺"
      plannedFeatures={['FEAT_MULTI_SPECIALTY_AGENDA', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
