import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const ScheduleView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="ATTENDANCE_SCHEDULE"
      icon="📅"
      plannedFeatures={['FEAT_MULTI_SPECIALTY_AGENDA', 'FEAT_PATIENT_DEMOGRAPHICS']}
    />
  );
};
