-- Frozen reference data. Never import the live application manifest into a historical migration.
-- Existing settings, groups, ACLs, users and clinical rows are preserved.
INSERT INTO sys_tenants (id, name, slug, cnpj, is_default, is_active, created_at, updated_at)
VALUES ('ee720158-6f98-42c3-b371-3d216d7f421a', 'Acme Organization', 'acme-organization', '00000000000191', true, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Default Application Metadata
-- ------------------------------------------------------------
INSERT INTO sys_applications (
  id, code, app_name, app_version, app_subtitle, app_description,
  app_logo_url, app_favicon_url,
  default_locale, default_supported_locales, default_timezone, default_dialing_code,
  default_max_login_attempts, default_lockout_duration_minutes, default_session_timeout_minutes,
  default_min_password_length, default_mfa_enabled, default_password_reset_token_ttl_hours,
  default_enable_audit_log, default_audit_retention_days, default_accepted_login_methods,
  default_extra_settings, primary_login_identifier, is_multi_tenant, is_default_application, is_active, created_at, updated_at
) VALUES (
  'app-001-openclinic-core', 'openclinic', 'OpenClinic', '0.1.1', 'Prontuário Eletrônico do Paciente (PEP) Open Source', 'OpenClinic Clinical Management System',
  '/logo.png', '/favicon.png',
  'pt-BR', '["pt-BR", "en-US"]'::jsonb, 'America/Sao_Paulo', '+55',
  5, 15, 30, 8, false, 24, true, 365, '["PASSWORD"]'::jsonb,
  '{}'::jsonb, 'CPF', false, true, true, NOW(), NOW()
)
ON CONFLICT (code) DO NOTHING;


--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('9678b2a6-9c1a-463c-be7e-ce0db797ff94', 'op_schedule', 'MENU', 'BUSINESS', 'Agendamento de consultas, calendário clínico e marcações', 'NAV_ATTENDANCE_SCHEDULE', 'calendar', '/attendance/schedule', 10, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('e7178144-733c-4404-a362-024d97e95706', 'op_attendance', 'MENU', 'BUSINESS', 'Recepção, fila de espera e triagem de pacientes', 'NAV_ATTENDANCE_QUEUE', 'users', '/attendance/queue', 20, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('5334ddd8-7fe3-4694-a4be-3a6af3b20a08', 'op_patients', 'MENU', 'BUSINESS', 'Cadastro geral de pacientes, histórico e documentos', 'NAV_CLINICAL_PATIENTS', 'user-plus', '/clinical/patients', 30, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('6e09e8dc-bb71-48e8-aece-d5bdafeafee3', 'op_consultations', 'MENU', 'BUSINESS', 'Atendimento médico ambulatorial, receitas e solicitações de exames', 'NAV_CLINICAL_CONSULTATIONS', 'activity', '/clinical/consultations', 40, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('eb69caa0-5be8-49d8-927a-97c156f99c53', 'op_pep', 'MENU', 'BUSINESS', 'Prontuário Eletrônico do Paciente, histórico clínico e evoluções', 'NAV_CLINICAL_PEP', 'file-text', '/clinical/records', 50, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('c908ee5f-4b3d-477b-939c-7f7e68e7dd50', 'op_billing', 'MENU', 'BUSINESS', 'Fechamento de faturas, guias TISS/TUSS e repasses médicos', 'NAV_FINANCIAL_BILLING', 'credit-card', '/financial/billing', 60, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('5c443e69-5c26-4ac5-936a-a64534534f82', 'op_cashflow', 'MENU', 'BUSINESS', 'Caixa diário, movimentações financeiras e fluxo de caixa', 'NAV_FINANCIAL_CASHFLOW', 'dollar-sign', '/financial/cash-flow', 70, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('3303509f-2a8b-4ec8-9ade-27773bd6103b', 'op_payables', 'MENU', 'BUSINESS', 'Gestão de contas a pagar, títulos a receber e conciliação', 'NAV_FINANCIAL_PAYABLES', 'credit-card', '/financial/payables', 80, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('4f224b28-0601-4b2a-9a7b-68bf09cafb5d', 'base_staff', 'MENU', 'BUSINESS', 'Cadastro de colaboradores, equipe assistencial e administrativa', 'NAV_BASE_STAFF', 'user-check', '/registries/staff', 90, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('5f1bb40d-479c-493c-bc0c-2986745d3471', 'base_health_plans', 'MENU', 'BUSINESS', 'Operadoras de saúde, planos credenciados e regras de autorização', 'NAV_BASE_HEALTH_PLANS', 'building', '/registries/health-plans', 100, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('9fabbbda-9c4f-4ebf-ba00-79ee4bb7f0c1', 'base_procedures', 'MENU', 'BUSINESS', 'Catálogo de procedimentos, tabela TUSS e valores', 'NAV_BASE_PROCEDURES', 'syringe', '/registries/procedures', 110, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('20da0448-ceba-48ce-937c-68848d3be028', 'base_shifts', 'MENU', 'BUSINESS', 'Escalas de trabalho, plantões assistenciais e turnos de atendimento', 'NAV_BASE_SHIFTS', 'clock', '/registries/shifts', 115, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('de0ef10c-ba25-4bb5-a127-0da21ee2c572', 'menu_mgmt_indicators', 'MENU', 'BUSINESS', 'Painel executivo de indicadores, taxa de ocupação e métricas clínicas', 'NAV_MGMT_INDICATORS', 'trending-up', '/management/metrics', 120, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('a0a6a3b1-3d2a-4060-b315-c91a87960dcb', 'menu_mgmt_reports', 'MENU', 'BUSINESS', 'Relatórios gerenciais analíticos, faturamento e produtividade', 'NAV_MGMT_REPORTS', 'bar-chart-2', '/management/reports', 130, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('9fc2350d-3197-44f8-a545-7b3343dac6a5', 'menu_sys_settings', 'MENU', 'ARCH', 'Regras de funcionamento, agendamentos, horários operacionais e preferências', 'NAV_SYS_SETTINGS', 'sliders', '/system/settings', 200, 'ADMIN', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('7604efff-b89f-4db9-a5be-74ee8d975a16', 'menu_sys_users', 'MENU', 'ARCH', 'Gestão de contas, colaboradores, perfis de acesso e matriz RBAC', 'NAV_SYS_USERS', 'users', '/system/users', 210, 'ADMIN', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('b420bd0a-5c44-4bb1-89ed-7db4b7c8835e', 'menu_sys_institution', 'MENU', 'ARCH', 'Dados cadastrais da clínica, CNPJ, CNES, logotipo e responsáveis técnicos', 'NAV_SYS_INSTITUTION', 'building', '/system/organizations', 220, 'ADMIN', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('1a3d2e7c-a936-4d42-98e4-63977082b347', 'menu_sys_audit', 'MENU', 'ARCH', 'Trilha de auditoria imutável, logs de acesso aos prontuários e LGPD', 'NAV_SYS_AUDIT', 'shield', '/system/audit-logs', 230, 'ADMIN', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('fbf6cec0-c179-41f1-b974-322f45945fa2', 'menu_platform_settings', 'MENU', 'ARCH', 'Parâmetros globais de infraestrutura, autenticação e segurança', 'NAV_PLATFORM_SETTINGS', 'sliders', '/platform/settings', 300, 'OWNER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('79601df3-f1a9-4a29-863b-998a262f12e7', 'menu_platform_tenants', 'MENU', 'ARCH', 'Gestão multi-tenant de contratantes, instâncias e isolamento', 'NAV_PLATFORM_TENANTS', 'grid', '/platform/tenants', 310, 'OWNER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('13328cfe-7933-4a1a-a85d-ecd71ff325a7', 'menu_platform_api_keys', 'MENU', 'ARCH', 'Gestão de chaves de API para integrações e credenciais M2M', 'NAV_PLATFORM_API_KEYS', 'key', '/platform/api-keys', 320, 'OWNER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('692f1557-1051-4877-9791-79b9e522e147', 'menu_platform_webhooks', 'MENU', 'ARCH', 'Conectores externos, filas de eventos, orquestração e webhooks', 'NAV_PLATFORM_WEBHOOKS', 'share-2', '/platform/integrations', 330, 'OWNER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('11bc7f72-bfb9-4db0-afe3-a683b4b5e786', 'menu_platform_policies', 'MENU', 'ARCH', 'Termos de uso, políticas de privacidade e acordos DPA/LGPD', 'NAV_PLATFORM_POLICIES', 'file-text', '/platform/policies', 340, 'OWNER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('dfed1fac-58ff-4144-8ca1-c3af7bb9dd24', 'menu_profile', 'MENU', 'ARCH', 'Visualização e edição dos dados cadastrais do perfil do usuário', 'USER_MENU_PROFILE', 'user', '/account/profile', 400, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('68ec094c-444a-45e1-b533-2a1fd992bc7a', 'menu_password', 'MENU', 'ARCH', 'Alteração de credenciais e senha de acesso', 'USER_MENU_SECURITY', 'key', '/account/security', 410, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
INSERT INTO sys_application_resources (id, item_code, resource_type, context, description, label_key, icon, route, sort_order, min_role, is_active, application_id)
VALUES ('b1b5c1d9-07bf-4e5b-8444-30dd1781a924', 'menu_help', 'MENU', 'ARCH', 'Central de ajuda, documentação e abertura de chamados', 'USER_MENU_HELP', 'help-circle', '/help', 420, 'USER', true, (SELECT id FROM sys_applications WHERE code = 'openclinic'))
ON CONFLICT (item_code) DO NOTHING;
--> statement-breakpoint
DO $$ DECLARE new_group_id VARCHAR(36); BEGIN
  IF NOT EXISTS (SELECT 1 FROM iam_groups WHERE name = 'All Users' AND tenant_id = (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')) THEN
    new_group_id := '39a405bc-8ed2-4d46-9526-2ccaabce8215';
    INSERT INTO iam_groups (id, name, description, is_default, tenant_id)
    VALUES (new_group_id, 'All Users', 'Standard default group with account, profile, and system support access.', true, (SELECT id FROM sys_tenants WHERE slug = 'acme-organization'));
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '511dd057-a526-4dc3-9111-b7c0b99502b0', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'bd455649-29c7-43bd-80c2-f44d0b2ee1e9', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd4d7dad1-4edc-48ab-841d-80d3338b4250', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'f1b58b02-93e0-4f49-8301-7649969b530a', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'e4b92828-3ebd-47ea-9aeb-a1933535e9df', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '56ae20e8-00ae-4448-9f3b-6e0987d78558', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
  END IF;
END $$;
--> statement-breakpoint
DO $$ DECLARE new_group_id VARCHAR(36); BEGIN
  IF NOT EXISTS (SELECT 1 FROM iam_groups WHERE name = 'Gestão Operacional' AND tenant_id = (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')) THEN
    new_group_id := '7762f78a-5a64-4311-b29b-e245fdad058e';
    INSERT INTO iam_groups (id, name, description, is_default, tenant_id)
    VALUES (new_group_id, 'Gestão Operacional', 'Gestao operacional completa, cadastros mestres e administracao institucional (Admin).', false, (SELECT id FROM sys_tenants WHERE slug = 'acme-organization'));
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c31c4bd1-7111-4675-84e3-9092de926312', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7b9c8074-a9b7-450b-812b-6de232e23be7', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '8b84f3ef-b4e6-40aa-907b-6c140bddda51', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '88b5ca1c-aa94-4d86-b47b-36849b94436c', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '531715a4-0b42-4829-b574-3476dfd4ede2', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'aa69201c-2019-4926-abee-847aa52f0ff3', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ac90bbb9-8043-46bc-9124-0d09d6c6b41d', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'b5a5ad83-25f5-4576-b600-f9cb08921659', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '346b8490-b1bc-4f21-be6d-792546b83df1', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '3440cf51-ac87-4ae8-8426-4ad24fa2aa28', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_consultations';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a3276d0a-d57d-4571-8e5f-845aa71e18d6', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_consultations';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '01f31238-983f-4a59-9fca-35f37bc3dfc9', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_consultations';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c141b962-de8c-4d3c-b91b-39a5957770db', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_pep';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '90c78757-a7e4-4d2f-910f-1882ba24b242', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_pep';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a8fecbda-5715-4218-a572-ea2b8cc717cb', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_pep';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '3d4f95d2-7e06-408c-b931-937e6d78790e', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '40108d0a-2a08-46c3-9198-b7e4ecd911fc', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7866720a-f92c-422e-a4d3-cf873fa42065', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'eb241434-fbfa-4a0d-ac02-834afef3c635', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_cashflow';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7d07a7c7-1bfc-4fa3-9e37-1af1072985d4', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_cashflow';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c00615d6-25ad-48e1-b32a-30912133c7ec', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_cashflow';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'bc691a03-8a68-46af-98d6-f9f825521108', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_payables';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd909e8b5-7c97-49a1-b679-2836482f0744', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_payables';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '85b0ff33-4b8a-4c92-a927-d6eebf296550', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_payables';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ff5527bc-40b4-48ea-8550-6470afd14239', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a91b28d1-ea28-4e86-a602-e1a517527058', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a567f30e-a3ef-4822-a9ca-3a17f4e1cc69', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'b6b897ae-9a64-47f0-b5f5-9e518d0df816', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'e3b63510-3466-48df-a562-17bce2787922', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '67921985-ffcc-4d92-8eb0-a0b1e86d37c0', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '85bbe7f6-970a-40a0-b9fa-f520fa873e8a', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '5487a6c2-5889-40f9-99e2-8c9eb7b5e2eb', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '869973ea-c89e-49b2-942e-6132f3d80aee', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '41f9b814-9280-445c-b2e5-2350f48db170', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_shifts';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '2ccfc94b-bac8-48d5-9fe7-a30057e7de75', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_shifts';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'f2d57a76-2a5d-44ab-a953-29af47fac908', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_shifts';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ec187db0-47c6-4e47-8934-96a58999a616', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_indicators';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c2638b33-aecf-46bd-bd9e-20554ec81b7e', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_indicators';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ec373d9f-2404-48a7-8300-55e134ef72cf', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_indicators';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'cfcce9d3-13f0-4cf6-ad7b-2b5fbd75bfe6', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_reports';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'bc4f083f-08a8-4338-bdcf-132db1c00f46', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_reports';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '8a391ebd-6060-467f-a1e4-536eb84ac753', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_reports';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7fd6ebd2-fe9f-4e23-8167-c72060e22e5d', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_settings';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'e8bfa6b1-7b6e-4d42-9c9b-1abebfa57c9d', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_settings';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'f79db268-cee7-49c0-812f-033a1e4c2a33', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_settings';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '4d9a6c1c-a3ed-4fbc-b4a8-be2ec961159c', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_users';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '6ee49ba6-034e-4127-85fe-952f0ca7f972', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_users';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '14ed165c-604c-456b-bf29-cc03d8ac3bce', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_users';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd18e082b-1433-4efc-ad62-75e0ab4ab1ee', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_institution';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '2647f00a-44ce-44bd-bb02-13daa4bed1b9', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_institution';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd91690c0-0298-40f9-a8af-b54988594184', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_institution';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '65cd128d-b5c5-4762-beb9-627a8513fc16', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_audit';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '07545465-7469-4c74-b8c3-ab5d6db8f3c8', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_audit';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '79a8fa64-be2a-414e-b4e9-0832e9a25001', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_audit';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '2b674f11-f814-4206-8dcb-7005c1a60160', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7646e323-ad8b-480b-bc90-7f0fbd703091', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ef0f930f-5640-467f-aa6d-08e445e08e55', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '0a6e377c-c64b-4341-adef-c4648d8304f4', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '361e6b06-6324-4ca4-b00a-cf8c2b00c024', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '08258b13-49be-4411-b0d7-270e8818410a', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c6f008bf-e5d9-4489-beb3-390e33733f62', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '91c7caaf-022f-439d-9433-4ec20a6c73fd', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '634d53bf-bf70-4a73-af87-bdf1360ed4d2', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
  END IF;
END $$;
--> statement-breakpoint
DO $$ DECLARE new_group_id VARCHAR(36); BEGIN
  IF NOT EXISTS (SELECT 1 FROM iam_groups WHERE name = 'Gestão Institucional' AND tenant_id = (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')) THEN
    new_group_id := '0c4de434-bac6-4ec6-97d0-83cf6742c445';
    INSERT INTO iam_groups (id, name, description, is_default, tenant_id)
    VALUES (new_group_id, 'Gestão Institucional', 'Parametros institucionais, relatorios executivos e auditoria de governanca.', false, (SELECT id FROM sys_tenants WHERE slug = 'acme-organization'));
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '76a7527f-ee61-4eb0-95ef-c35f60094f7b', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd73625df-3cc2-4aa1-ae89-a8bfa80c7ed2', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '8b489101-90df-4515-b9da-1a4936e5220f', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '8b09ca07-d922-415b-bf7b-3c86dc5a9528', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_cashflow';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '14b2771a-5611-4384-8725-0b3cc0ccd1cb', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_cashflow';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ff928b91-e9f9-4196-887f-00d8093ff757', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_cashflow';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ce4ea5cb-1a56-4e6c-aea3-bbbef143726a', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '4a9f2661-808a-4ade-b538-ad4d0e8c6eec', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '011c2683-72b0-4339-96cc-6c767781fbf8', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ec5d68b2-4850-4252-827b-aacd91fc7cf4', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'e78f0843-282e-448c-82f6-2fd7f2030fc2', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '22c51dde-baea-4d37-bd72-e0cc7ec5039f', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '202d4f03-a8db-4cc7-a77e-10fad83a1930', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd821b49c-87eb-43d9-9467-6d7935dcde23', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a7d8eb07-833c-4b49-94a3-a61930f88f92', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '870fe212-307c-4baa-9f43-5b46f6879636', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_indicators';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '13177692-0b7a-4564-a4be-09623c5c4c8b', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_indicators';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '59f151ac-17f4-438e-90a0-662002f43145', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_indicators';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '24962310-13b4-4d73-bb0d-803931a96103', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_reports';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c12f35e0-71ae-421e-9dd0-027a5a4db745', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_reports';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd22619eb-8455-4447-8099-d85934707908', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_mgmt_reports';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '36a0575f-db4d-48d0-9c1c-0a874a499b19', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_settings';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '10bade48-c0d1-44e3-8d86-3f380cc97ac2', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_settings';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '9b2b2bf1-c240-4dbd-9bbc-6f826933c620', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_settings';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '990c2302-5bd2-499d-b35c-ea8f7cb2d60c', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_institution';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'f5633cc3-f1d7-4be1-8b4c-01432c42602f', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_institution';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c911fd56-a585-4216-b662-79d4d4ef6399', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_institution';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'cfea2e26-27c3-4bcf-8af5-59dd539ba135', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_audit';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '1d13342f-f05f-4ecd-b41b-8a9909a6901a', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_audit';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '95fb941e-e363-40d1-915b-a91db0a0346e', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_sys_audit';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7270f737-f091-4013-9dd0-7981d98be9d2', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '98db77fa-7534-431b-9967-4fe7d6d76fca', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '224e8b7b-8141-489c-b6d9-3e4c2707edc4', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd5add126-02ae-4372-939f-23f6cea8db3b', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '17c39ebf-d408-41ca-bb23-99a536edeb74', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '21b0ca50-6dee-4e5f-8518-5e08bd24f6a9', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '474088fc-c9f4-43bf-b61d-db9b1875a8fc', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '03d1cc47-ac6b-474b-a0a3-156c4e4a9063', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd470e801-e8ac-4148-8524-1d9c5fb7f6cd', new_group_id, id, 'MANAGE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
  END IF;
END $$;
--> statement-breakpoint
DO $$ DECLARE new_group_id VARCHAR(36); BEGIN
  IF NOT EXISTS (SELECT 1 FROM iam_groups WHERE name = 'Corpo Clínico & Médicos' AND tenant_id = (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')) THEN
    new_group_id := 'ee97436f-451c-4167-a913-48f590420ed0';
    INSERT INTO iam_groups (id, name, description, is_default, tenant_id)
    VALUES (new_group_id, 'Corpo Clínico & Médicos', 'Atendimento medico, consultas, prescricoes digitais, prontuario eletronico (PEP) e agenda.', false, (SELECT id FROM sys_tenants WHERE slug = 'acme-organization'));
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '50619b4a-e28c-4107-b99a-20e4ea8c5281', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '51e8cb6b-c01e-49b9-9c82-76424711dd88', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'fa76fe6d-8cf8-4274-973a-3cc9fc15ec31', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'f2846305-7091-41c5-9c67-3cb73463d366', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '3309779a-493b-42cb-83d0-212e98c1410c', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '567fd5e5-ed39-44ef-8b6e-77796cf692ba', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'be300030-b9b1-48f8-ad83-e9881b6f0299', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_consultations';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'e4d4f775-ee83-4b83-9c41-4772895283b5', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_consultations';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '79365bc0-e195-40bf-809c-ab96aa7ffab0', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_pep';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '09dff0d1-5cde-47f8-8a00-8dd6e18b3a58', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_pep';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '9515b292-3fce-42a2-b179-2a536b6914ae', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '26808c78-6f3c-4a1d-b725-92c416ba2ded', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'be1f6056-1d18-46da-afcc-64ba7a88759c', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'dd6392cc-3c4c-4c9b-9ef4-96bdeb52b1d2', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '93c72989-f88a-419c-9415-730c0e35335f', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '4dff2333-be42-47e3-86e7-8d170455dc6a', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_staff';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ab83dd65-a945-48ca-966a-69d76dd1b56d', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'c9a7af81-1c53-4de9-a04f-c307450140dc', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '085ae7f2-f345-4d25-ad5e-01c3970c5318', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '0960ad54-451c-4ce1-be9e-23ac35ae152e', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'b366a809-3323-4153-a8da-ebb306da64aa', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '0c5269c4-071c-47c5-870a-c21849e8f5a0', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
  END IF;
END $$;
--> statement-breakpoint
DO $$ DECLARE new_group_id VARCHAR(36); BEGIN
  IF NOT EXISTS (SELECT 1 FROM iam_groups WHERE name = 'Enfermagem' AND tenant_id = (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')) THEN
    new_group_id := '9b156390-86ff-4065-90f3-e82795490bdc';
    INSERT INTO iam_groups (id, name, description, is_default, tenant_id)
    VALUES (new_group_id, 'Enfermagem', 'Recepcao clinica, triagem, fila de atendimento, prontuario eletronico e evolucao de enfermagem.', false, (SELECT id FROM sys_tenants WHERE slug = 'acme-organization'));
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '37e9feef-90f2-4f4b-8728-a769c66d95d8', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '6e417016-8c15-45b7-a41e-6aee178b53b9', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a2f56404-8436-4f34-8be4-dc9b72e80545', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '5c82b85e-8799-463c-b8de-afa718060661', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a4d520d0-6403-46d5-9836-0d8267377ca2', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'b1b2ee2b-7c42-4a2e-bb57-dcff57fcc07c', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a9c29ecc-7f01-4b50-83b8-4df21fdeded2', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_pep';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '0421aba0-eb8a-4207-82d1-92111a5a1118', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_pep';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '17f51067-20a8-4b0f-ac16-d15ca328448f', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '35429c52-0442-4c55-b95e-cba5e0a5bbcf', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '1d7b6d6e-db3e-43b3-8435-31bde41a66a2', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_shifts';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'd93f56ef-45af-4e20-aeb9-586eb5b993d0', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_shifts';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ea247038-fafe-4d35-b326-6e4f7033fa77', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '224a33d8-4253-4654-8def-67e8647e2d3a', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'ca1cb2a7-49da-41b0-bf1d-e72963604329', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'e5070f4d-3555-420e-99ec-f894e0a950dd', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '03c16ce1-e5ac-435a-b5ca-c9efb92b01c3', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'efba1666-f21a-4f3b-8192-616686046ca6', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
  END IF;
END $$;
--> statement-breakpoint
DO $$ DECLARE new_group_id VARCHAR(36); BEGIN
  IF NOT EXISTS (SELECT 1 FROM iam_groups WHERE name = 'Atendimento & Recepção' AND tenant_id = (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')) THEN
    new_group_id := '5b6cc9dc-e9c0-4c2b-ab5a-ad3c6ec95892';
    INSERT INTO iam_groups (id, name, description, is_default, tenant_id)
    VALUES (new_group_id, 'Atendimento & Recepção', 'Agendamento de consultas, marcacoes, fila de acolhimento, cadastro de pacientes e faturamento.', false, (SELECT id FROM sys_tenants WHERE slug = 'acme-organization'));
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '0f410ce6-f6c9-40bd-a314-4ef10136701e', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'b5bd3df6-ec28-46fe-8ade-dff07148d2c3', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_schedule';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '57bc0f2c-2e01-4680-94de-0981983eb09d', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7344e2bf-4eee-4e24-bdf0-e6c5f5e89f2a', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_attendance';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'fbd91f17-d429-4f88-8137-0050b19fc410', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '78e529b4-6f75-4ba5-a3ff-e58c15a7d6ab', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_patients';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'cfd3b0c5-f8cf-40a4-a657-f6d75a20d4fc', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'f1ef57a1-28d6-4809-a5a9-0d46ee43247e', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_health_plans';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'dfb8f968-2b5c-47da-9a9e-4c61df57a54d', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'e0c8d5ff-eb09-40cc-a65f-0034b8712819', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'base_procedures';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'a11d18b2-dcf1-4873-971e-c656bc25fe7b', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '170d7b24-384e-4efd-ac04-60d3ed7d92db', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'op_billing';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '16eeab03-69bf-41b3-9b13-a028c6485a43', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '2175debc-f290-4f11-a0e3-5c09f6405c6d', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_profile';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '7aec7250-3c02-492b-9eba-c2973832f8aa', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT 'edf74fd0-e217-4532-8740-9b3d63911013', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_password';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '31e0a95e-eff8-4827-a561-4246b49ace54', new_group_id, id, 'READ', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
    INSERT INTO iam_permissions (id, group_id, resource_id, action, effect, tenant_id)
    SELECT '642211da-bfe6-43d2-8e98-6f98cdfdeeed', new_group_id, id, 'WRITE', 'ALLOW', (SELECT id FROM sys_tenants WHERE slug = 'acme-organization')
    FROM sys_application_resources WHERE item_code = 'menu_help';
  END IF;
END $$;
