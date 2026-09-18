import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const PepView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="CLINICAL_PEP"
      icon="📋"
      plannedFeatures={['FEAT_CLINICAL_TIMELINE', 'FEAT_DIGITAL_PRESCRIPTIONS', 'FEAT_FHIR_INTEROP', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
