import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const MetricsView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="MANAGEMENT_METRICS"
      icon="📈"
      plannedFeatures={['FEAT_REVENUE_CYCLE', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
