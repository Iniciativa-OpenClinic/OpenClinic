import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const OperationalSettingsView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="ADMINISTRATION_OPERATIONAL"
      icon="⚙️"
      plannedFeatures={['FEAT_MULTI_SPECIALTY_AGENDA', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
