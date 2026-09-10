import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListPatientsUseCase } from '../../src/business/application/list-patients.use-case.js';
import { CreatePatientUseCase } from '../../src/business/application/create-patient.use-case.js';
import { ListPractitionersUseCase } from '../../src/business/application/list-practitioners.use-case.js';
import { ListEncountersUseCase } from '../../src/business/application/list-encounters.use-case.js';
import type {
  IPatientRepository,
  IPractitionerRepository,
  IEncounterRepository,
} from '../../src/business/domain/clinical.repositories.js';
import { ValidationError } from '@openclinic/core';

describe('Clinical Use Cases Suite', () => {
  let mockPatientRepo: IPatientRepository;
  let mockPractitionerRepo: IPractitionerRepository;
  let mockEncounterRepo: IEncounterRepository;

  beforeEach(() => {
    mockPatientRepo = {
      listActive: vi.fn().mockResolvedValue([
        { id: 'pat-1', full_name: 'Ana Silva', is_active: true, tenant_id: 'tenant-1', created_at: new Date(), updated_at: new Date() },
      ]),
      getById: vi.fn(),
      create: vi.fn().mockImplementation(async (data) => ({
        ...data,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    };

    mockPractitionerRepo = {
      listActive: vi.fn().mockResolvedValue([
        { id: 'prac-1', full_name: 'Dr. Carlos', practitioner_type: 'PHYSICIAN', is_clinical_staff: true, is_active: true, tenant_id: 'tenant-1', created_at: new Date(), updated_at: new Date() },
      ]),
      getById: vi.fn(),
      create: vi.fn(),
    };

    mockEncounterRepo = {
      listSummaries: vi.fn().mockResolvedValue([
        {
          id: 'enc-1',
          start_time: new Date(),
          status: 'IN_PROGRESS',
          chief_complaint: 'Febre alta',
          patient_id: 'pat-1',
          patient_name: 'Ana Silva',
          practitioner_id: 'prac-1',
          practitioner_name: 'Dr. Carlos',
        },
      ]),
      getById: vi.fn(),
      create: vi.fn(),
    };
  });

  describe('ListPatientsUseCase', () => {
    it('should list all active patients for tenant', async () => {
      const useCase = new ListPatientsUseCase(mockPatientRepo);
      const patients = await useCase.execute('tenant-1');

      expect(mockPatientRepo.listActive).toHaveBeenCalledWith('tenant-1');
      expect(patients).toHaveLength(1);
      expect(patients[0].full_name).toBe('Ana Silva');
    });
  });

  describe('CreatePatientUseCase', () => {
    it('should create a new patient when full_name is provided', async () => {
      const useCase = new CreatePatientUseCase(mockPatientRepo);
      const newPatient = await useCase.execute(
        { full_name: 'João Santos', cpf: '123.456.789-00' },
        'tenant-1'
      );

      expect(mockPatientRepo.create).toHaveBeenCalled();
      expect(newPatient.full_name).toBe('João Santos');
      expect(newPatient.tenant_id).toBe('tenant-1');
    });

    it('should throw ValidationError when full_name is missing or blank', async () => {
      const useCase = new CreatePatientUseCase(mockPatientRepo);
      await expect(
        useCase.execute({ full_name: '' } as any, 'tenant-1')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('ListPractitionersUseCase', () => {
    it('should list practitioners for tenant', async () => {
      const useCase = new ListPractitionersUseCase(mockPractitionerRepo);
      const practitioners = await useCase.execute('tenant-1');

      expect(mockPractitionerRepo.listActive).toHaveBeenCalledWith('tenant-1');
      expect(practitioners).toHaveLength(1);
      expect(practitioners[0].practitioner_type).toBe('PHYSICIAN');
    });
  });

  describe('ListEncountersUseCase', () => {
    it('should list clinical encounter summaries', async () => {
      const useCase = new ListEncountersUseCase(mockEncounterRepo);
      const encounters = await useCase.execute('tenant-1');

      expect(mockEncounterRepo.listSummaries).toHaveBeenCalledWith('tenant-1');
      expect(encounters).toHaveLength(1);
      expect(encounters[0].patient_name).toBe('Ana Silva');
    });
  });
});
