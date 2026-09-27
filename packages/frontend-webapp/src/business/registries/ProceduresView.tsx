import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const ProceduresView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="REGISTRIES_PROCEDURES"
      icon="🔬"
      plannedFeatures={['FEAT_TISS_BATCH_EXPORT', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
