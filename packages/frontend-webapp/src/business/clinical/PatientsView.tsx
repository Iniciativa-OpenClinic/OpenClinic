import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const PatientsView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="CLINICAL_PATIENTS"
      icon="👥"
      plannedFeatures={['FEAT_PATIENT_DEMOGRAPHICS', 'FEAT_FHIR_INTEROP', 'FEAT_AUDIT_TRAIL']}
    />
  );
};
