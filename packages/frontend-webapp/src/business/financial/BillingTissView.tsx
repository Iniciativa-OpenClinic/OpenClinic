import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const BillingTissView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="FINANCIAL_BILLING"
      icon="📑"
      plannedFeatures={['FEAT_TISS_BATCH_EXPORT', 'FEAT_REVENUE_CYCLE', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
