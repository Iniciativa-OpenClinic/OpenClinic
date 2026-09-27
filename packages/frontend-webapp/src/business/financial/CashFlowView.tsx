import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const CashFlowView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="FINANCIAL_CASHFLOW"
      icon="💰"
      plannedFeatures={['FEAT_REVENUE_CYCLE', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
