import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const PayablesReceivablesView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="FINANCIAL_PAYABLES"
      icon="📊"
      plannedFeatures={['FEAT_REVENUE_CYCLE', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
