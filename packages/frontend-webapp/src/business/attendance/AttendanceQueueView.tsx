import React from 'react';
import { UnderConstructionCard } from '../../components/UnderConstructionCard.js';

export const AttendanceQueueView: React.FC = () => {
  return (
    <UnderConstructionCard
      moduleKey="ATTENDANCE_QUEUE"
      icon="⏱️"
      plannedFeatures={['FEAT_MANCHESTER_TRIAGE', 'FEAT_PATIENT_DEMOGRAPHICS']}
    />
  );
};
