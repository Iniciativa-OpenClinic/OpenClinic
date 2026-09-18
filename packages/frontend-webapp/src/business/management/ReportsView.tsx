import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const ReportsView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="MANAGEMENT_REPORTS"
      icon="📑"
      plannedFeatures={['FEAT_CLINICAL_TIMELINE', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
