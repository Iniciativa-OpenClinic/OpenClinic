import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const ConsultationsView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="CLINICAL_CONSULTATIONS"
      icon="🩺"
      plannedFeatures={['FEAT_CLINICAL_TIMELINE', 'FEAT_DIGITAL_PRESCRIPTIONS', 'FEAT_FHIR_INTEROP']}
    />
  );
};
