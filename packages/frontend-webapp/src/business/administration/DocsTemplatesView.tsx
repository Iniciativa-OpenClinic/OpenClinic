import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const DocsTemplatesView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="ADMINISTRATION_TEMPLATES"
      icon="📄"
      plannedFeatures={['FEAT_DIGITAL_PRESCRIPTIONS', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
