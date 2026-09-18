import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const HealthPlansView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="REGISTRIES_HEALTHPLANS"
      icon="🏥"
      plannedFeatures={['FEAT_TISS_BATCH_EXPORT', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
