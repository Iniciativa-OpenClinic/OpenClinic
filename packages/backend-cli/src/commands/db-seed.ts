import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '@openclinic/core';
import { resolveDatabaseTarget, type DatabaseOptions } from '../utils/database-target.js';
import { inspectMigrations, MIGRATION_LOCK } from '../utils/migration-runner.js';

export async function dbSeed(options: DatabaseOptions = {}): Promise<void> {
  if (!options.demo) throw new Error('Reference data is versioned: run db:migrate. Demo data requires db:seed --demo on an empty local database.');
  if (options.target === 'remote') throw new Error('Demo seeding is local only. Use an explicit maintenance clone to replace the remote demo.');
  const destination = resolveDatabaseTarget(options, true);
  await seedDemoDatabase(destination.url);
}

export async function seedDemoDatabase(url: string): Promise<void> {
  const client = postgres(url, { max: 1, connect_timeout: 10 });
  try {
    await client.begin(async sql => {
      await sql`SET LOCAL lock_timeout = '5s'`;
      const [lock] = await sql`SELECT pg_try_advisory_xact_lock(${MIGRATION_LOCK}) AS acquired`;
      if (!lock?.acquired) throw new Error('Another database maintenance operation is running.');
      const state = await inspectMigrations(sql);
      if (state.pending.length || state.needsBaseline) throw new Error('Apply all migrations before demo seeding.');
      const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
      for (const table of tables) {
        await sql`LOCK TABLE ${sql('public')}.${sql(table.tablename)} IN SHARE ROW EXCLUSIVE MODE`;
        if (table.tablename.startsWith('app_') || ['iam_users', 'iam_sessions', 'iam_user_groups', 'sys_audit_logs'].includes(table.tablename)) {
          const [row] = await sql`SELECT EXISTS (SELECT 1 FROM ${sql('public')}.${sql(table.tablename)} LIMIT 1) AS populated`;
          if (row?.populated) throw new Error('Demo seed refused: database already contains operational data.');
        }
      }
      const [tenant] = await sql`SELECT id FROM sys_tenants WHERE slug = 'openclinic-system'`;
      if (!tenant) throw new Error('Reference tenant missing.');
      const groupRows = await sql`SELECT id, name FROM iam_groups WHERE tenant_id = ${tenant.id}`;
      const groupIds: Record<string, string> = Object.fromEntries(groupRows.map(group => [group.name, group.id]));
    // 6. Criar Usuários Canônicos (Demonstração / Teste) em iam_users
    console.log('  -> Provisionando usuarios canonicos com hash Argon2id (senha: temp1234)...');
    const defaultPasswordHash = await hashPassword('temp1234');

    const seedUsers = [
      {
        username: 'joao.silva',
        email: 'joao@clinica.com.br',
        cpf: '12345678909',
        full_name: 'João Silva',
        display_name: 'João Silva',
        role: 'OWNER',
        job_title: 'Superadministrador / Proprietário',
        is_tenant_owner: true,
        groups: ['Todos os Usuários'],
      },
      {
        username: 'lucas.santos',
        email: 'lucas@clinica.com.br',
        cpf: '98765432100',
        full_name: 'Lucas Santos',
        display_name: 'Lucas Santos',
        role: 'ADMIN',
        job_title: 'Administrador de Sistemas',
        is_tenant_owner: false,
        groups: ['Todos os Usuários', 'Gestão Operacional'],
      },
      {
        username: 'marcos.ferreira',
        email: 'marcos@clinica.com.br',
        cpf: '11122233396',
        full_name: 'Dr. Marcos Ferreira',
        display_name: 'Dr. Marcos Ferreira',
        role: 'USER',
        job_title: 'Diretor Clínico / Responsável Técnico',
        is_tenant_owner: false,
        groups: ['Todos os Usuários', 'Corpo Clínico & Médicos', 'Gestão Institucional'],
      },
      {
        username: 'mateus.oliveira',
        email: 'mateus@clinica.com.br',
        cpf: '22233344405',
        full_name: 'Dr. Mateus Oliveira',
        display_name: 'Dr. Mateus Oliveira',
        role: 'USER',
        job_title: 'Médico Cardiologista',
        is_tenant_owner: false,
        groups: ['Todos os Usuários', 'Corpo Clínico & Médicos'],
      },
      {
        username: 'marta.lima',
        email: 'marta@clinica.com.br',
        cpf: '33344455508',
        full_name: 'Marta Lima',
        display_name: 'Marta Lima',
        role: 'USER',
        job_title: 'Enfermeira Chefe',
        is_tenant_owner: false,
        groups: ['Todos os Usuários', 'Enfermagem'],
      },
      {
        username: 'ana.souza',
        email: 'ana@clinica.com.br',
        cpf: '44455566619',
        full_name: 'Ana Souza',
        display_name: 'Ana Souza',
        role: 'USER',
        job_title: 'Atendente de Recepção e Triagem',
        is_tenant_owner: false,
        groups: ['Todos os Usuários', 'Atendimento & Recepção'],
      },
    ];

    const userMap: Record<string, string> = {};

    for (const u of seedUsers) {
      const existingUser = await sql`
        SELECT id FROM iam_users
        WHERE (username = ${u.username} OR email = ${u.email})
          AND (tenant_id = ${tenant.id} OR tenant_id IS NULL)
        LIMIT 1
      `;

      let targetUserId: string;

      if (existingUser.length > 0 && existingUser[0]?.id) {
        targetUserId = existingUser[0].id;
        await sql`
          UPDATE iam_users
          SET
            username = ${u.username},
            email = ${u.email},
            cpf = ${u.cpf},
            full_name = ${u.full_name},
            display_name = ${u.display_name},
            role = ${u.role},
            job_title = ${u.job_title},
            is_tenant_owner = ${u.is_tenant_owner},
            is_active = true,
            tenant_id = ${tenant.id},
            updated_at = NOW()
          WHERE id = ${targetUserId}
        `;
      } else {
        targetUserId = randomUUID();
        await sql`
          INSERT INTO iam_users (
            id, username, email, cpf, full_name, display_name, role, job_title,
            hashed_password, is_active, is_tenant_owner, tenant_id
          ) VALUES (
            ${targetUserId}, ${u.username}, ${u.email}, ${u.cpf}, ${u.full_name}, ${u.display_name},
            ${u.role}, ${u.job_title}, ${defaultPasswordHash}, true, ${u.is_tenant_owner}, ${tenant.id}
          )
        `;
      }

      userMap[u.username] = targetUserId;
      console.log(`  [OK] Usuario: ${u.username} (${u.role}) -> ${targetUserId}`);

      // Vincular grupos em iam_user_groups
      for (const grpName of u.groups) {
        const gId = groupIds[grpName];
        if (gId) {
          await sql`
            INSERT INTO iam_user_groups (id, user_id, group_id)
            VALUES (${randomUUID()}, ${targetUserId}, ${gId})
            ON CONFLICT (user_id, group_id) DO NOTHING
          `;
        }
      }
    }

    // 7. Profissionais de Saúde (app_practitioners) vinculados aos Usuários
    console.log('  -> Vinculando catalogo clinico de profissionais aos usuarios criados...');
    
    const practitioners = [
      {
        id: 'prac-001-mateus-oliveira',
        user_id: userMap['mateus.oliveira'],
        full_name: 'Dr. Mateus Oliveira',
        cpf: '22233344405',
        practitioner_type: 'CLINICAL',
        job_title: 'Médico Cardiologista',
        council_type: 'CRM',
        council_number: '123456',
        council_uf: 'SP',
        primary_specialty: 'Cardiologia',
        phone: '(11) 98111-2222',
        email: 'mateus@clinica.com.br',
        is_clinical_staff: true,
      },
      {
        id: 'prac-002-marcos-ferreira',
        user_id: userMap['marcos.ferreira'],
        full_name: 'Dr. Marcos Ferreira',
        cpf: '11122233396',
        practitioner_type: 'CLINICAL',
        job_title: 'Diretor Clínico / Responsável Técnico',
        council_type: 'CRM',
        council_number: '654321',
        council_uf: 'SP',
        primary_specialty: 'Clínica Médica e Cardiologia',
        phone: '(11) 98222-3333',
        email: 'marcos@clinica.com.br',
        is_clinical_staff: true,
      },
      {
        id: 'prac-003-marta-lima',
        user_id: userMap['marta.lima'],
        full_name: 'Marta Lima',
        cpf: '33344455508',
        practitioner_type: 'CLINICAL',
        job_title: 'Enfermeira Chefe',
        council_type: 'COREN',
        council_number: '78910',
        council_uf: 'SP',
        primary_specialty: 'Enfermagem Geral e Triagem',
        phone: '(11) 98333-4444',
        email: 'marta@clinica.com.br',
        is_clinical_staff: true,
      },
      {
        id: 'prac-004-ana-souza',
        user_id: userMap['ana.souza'],
        full_name: 'Ana Souza',
        cpf: '44455566619',
        practitioner_type: 'ADMINISTRATIVE',
        job_title: 'Atendente de Recepção e Triagem',
        council_type: null,
        council_number: null,
        council_uf: null,
        primary_specialty: 'Atendimento e Acolhimento',
        phone: '(11) 98444-5555',
        email: 'ana@clinica.com.br',
        is_clinical_staff: false,
      },
    ];

    for (const prac of practitioners) {
      await sql`
        INSERT INTO app_practitioners (
          id, tenant_id, user_id, full_name, cpf, practitioner_type, job_title,
          council_type, council_number, council_uf, primary_specialty,
          phone, email, is_clinical_staff, is_active
        ) VALUES (
          ${prac.id}, ${tenant.id}, ${prac.user_id ?? null}, ${prac.full_name}, ${prac.cpf}, ${prac.practitioner_type},
          ${prac.job_title}, ${prac.council_type}, ${prac.council_number}, ${prac.council_uf},
          ${prac.primary_specialty}, ${prac.phone}, ${prac.email}, ${prac.is_clinical_staff}, true
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          full_name = EXCLUDED.full_name,
          cpf = EXCLUDED.cpf,
          job_title = EXCLUDED.job_title,
          primary_specialty = EXCLUDED.primary_specialty,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          updated_at = NOW()
      `;
      console.log(`  [OK] Profissional: ${prac.full_name} vinculado ao user_id: ${prac.user_id}`);
    }

    // 8. Pacientes (app_patients)
    console.log('  -> Sincronizando pacientes de teste...');
    const patientIds = {
      maria: 'pat-001-uuid-4a8b-91c2-ef3401',
      joao: 'pat-002-uuid-7b3f-42a1-de8902',
      beatriz: 'pat-003-uuid-8c4d-53b2-ef9003',
    };

    const patients = [
      {
        id: patientIds.maria,
        full_name: 'Maria Aparecida da Silva',
        cpf: '55566677720',
        cns: '700000000000001',
        birth_date: '1984-05-14',
        gender: 'FEMININO',
        email: 'maria.silva@email.com',
        phone: '(11) 98765-4321',
        address: 'Av. Paulista, 1000, Apto 42 - Bela Vista, São Paulo/SP',
        emergency_contact: 'Carlos Silva (Esposo) - (11) 98888-1111',
        insurance_name: 'Unimed Nacional',
        insurance_number: '0037.9821.4421.00-1',
        allergies_notes: 'Alergia severa a Dipirona e Penicilina. Histórico de bronquite asmática.',
      },
      {
        id: patientIds.joao,
        full_name: 'João Pedro Oliveira',
        cpf: '66677788830',
        cns: '700000000000002',
        birth_date: '1992-11-20',
        gender: 'MASCULINO',
        email: 'joao.pedro@email.com',
        phone: '(11) 91234-5678',
        address: 'Rua Augusta, 550, Casa 3 - Consolação, São Paulo/SP',
        emergency_contact: 'Fernanda Oliveira (Irmã) - (11) 97777-2222',
        insurance_name: 'Particular',
        insurance_number: 'PART-2026-88',
        allergies_notes: 'Sem alergias medicamentosas relatadas.',
      },
      {
        id: patientIds.beatriz,
        full_name: 'Beatriz Santos Costa',
        cpf: '77788899941',
        cns: '700000000000003',
        birth_date: '1975-03-08',
        gender: 'FEMININO',
        email: 'beatriz.costa@email.com',
        phone: '(11) 94567-8901',
        address: 'Rua Domingos de Morais, 1200 - Vila Mariana, São Paulo/SP',
        emergency_contact: 'Marcos Costa (Filho) - (11) 96666-3333',
        insurance_name: 'Bradesco Saúde',
        insurance_number: 'BRAD-998822-01',
        allergies_notes: 'Intolerância a AINEs (anti-inflamatórios não esteroides).',
      },
    ];

    for (const pat of patients) {
      await sql`
        INSERT INTO app_patients (
          id, tenant_id, full_name, cpf, cns, birth_date, gender,
          email, phone, address, emergency_contact, insurance_name,
          insurance_number, allergies_notes, is_active
        ) VALUES (
          ${pat.id}, ${tenant.id}, ${pat.full_name}, ${pat.cpf}, ${pat.cns},
          ${pat.birth_date}, ${pat.gender}, ${pat.email}, ${pat.phone},
          ${pat.address}, ${pat.emergency_contact}, ${pat.insurance_name},
          ${pat.insurance_number}, ${pat.allergies_notes}, true
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          cpf = EXCLUDED.cpf,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          insurance_name = EXCLUDED.insurance_name,
          insurance_number = EXCLUDED.insurance_number,
          allergies_notes = EXCLUDED.allergies_notes,
          updated_at = NOW()
      `;
      console.log(`  [OK] Paciente: ${pat.full_name} (${pat.id})`);
    }

    // 9. Agendamentos, Atendimentos e Prescrições Clínicas
    console.log('  -> Inserindo historico clinico de teste (Agendamento, Consulta e Prescricao)...');
    const apptId = 'apt-001-uuid-rotina-mateus';
    await sql`
      INSERT INTO app_appointments (
        id, tenant_id, patient_id, practitioner_id, appointment_date,
        duration_minutes, status, type, notes, is_active
      ) VALUES (
        ${apptId}, ${tenant.id}, ${patientIds.maria}, 'prac-001-mateus-oliveira',
        NOW() - INTERVAL '2 hours', 30, 'COMPLETED', 'ROUTINE',
        'Consulta de retorno para acompanhamento pressórico', true
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const encounterId = 'enc-001-uuid-consulta-maria';
    await sql`
      INSERT INTO app_encounters (
        id, tenant_id, patient_id, practitioner_id, appointment_id,
        start_time, end_time, status, chief_complaint, diagnosis,
        clinical_notes, is_active
      ) VALUES (
        ${encounterId}, ${tenant.id}, ${patientIds.maria}, 'prac-001-mateus-oliveira',
        ${apptId}, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes',
        'FINISHED', 'Retorno de rotina com queixa de cefaleia ocasional',
        'I10 - Hipertensão essencial (primária)',
        'PA: 130/80 mmHg, FC: 72 bpm. Paciente orientada sobre dieta com pouco sódio e atividade física leve regular.',
        true
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const prescId = 'psc-001-uuid-losartana-maria';
    await sql`
      INSERT INTO app_prescriptions (
        id, tenant_id, encounter_id, patient_id, practitioner_id,
        medication_name, dosage, instructions, is_active
      ) VALUES (
        ${prescId}, ${tenant.id}, ${encounterId}, ${patientIds.maria}, 'prac-001-mateus-oliveira',
        'Losartana Potássica', '50mg', 'Tomar 1 comprimido pela manhã em jejum de uso contínuo.', true
      )
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('  [OK] Registro de consulta e prescricao concluido com sucesso!');


    });
    console.log('Demo data created. This command will refuse a second run on populated databases.');
  } finally { await client.end(); }
}
