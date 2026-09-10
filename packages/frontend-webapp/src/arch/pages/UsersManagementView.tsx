import React, { useState, useMemo } from 'react';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  adminResetPassword,
  toggleUserStatus,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
  getUserGroups,
  addUserToGroup,
  removeUserFromGroup,
  type UserListItem,
  type GroupListItem,
  type GroupMembersResponse,
  type UserGroupsResponse,
} from '../../services/api.js';
import { useI18n, SupportedLocales } from '../../i18n/index.js';
import { UserRole, Cpf, Name, Username, Email, PasswordPolicy } from '@openclinic/core/shared';
import type { UserProfile } from '../../types/auth.js';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';
import { EyeIcon, EyeOffIcon } from '../../components/EyeIcons.js';
import { FieldLabelWithTooltip, ToggleSwitch } from '../components/FormControls.js';

const ROLE_BADGE_STYLES: Record<UserRole, { bg: string; color: string; border: string; labelKey: string }> = {
  [UserRole.OWNER]: {
    bg: '#fef3c7',
    color: '#b45309',
    border: '1px solid #fde68a',
    labelKey: 'ROLE_OPTION_OWNER',
  },
  [UserRole.ADMIN]: {
    bg: '#e0e7ff',
    color: '#4338ca',
    border: '1px solid #c7d2fe',
    labelKey: 'ROLE_OPTION_ADMIN',
  },
  [UserRole.USER]: {
    bg: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    labelKey: 'ROLE_OPTION_USER',
  },
};

export interface UsersManagementViewProps {
  currentUser: UserProfile | null;
  onOpenUserPermissions: (user: UserListItem) => void;
  onOpenGroupPermissions: (group: GroupListItem) => void;
  onProfileUpdated?: () => void;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  currentUser,
  onOpenUserPermissions,
  onOpenGroupPermissions,
  onProfileUpdated,
}) => {
  const { t } = useI18n();
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'groups'>('users');

  // Usuários
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);

  // Grupos
  const [groupsList, setGroupsList] = useState<GroupListItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Modais de Usuário
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserCpf, setNewUserCpf] = useState('');
  const [newUserJobTitle, setNewUserJobTitle] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Temp@1234');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState<'OWNER' | 'ADMIN' | 'USER'>('USER');
  const [newUserActive, setNewUserActive] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createTouched, setCreateTouched] = useState<Record<string, boolean>>({});

  const [editTargetUser, setEditTargetUser] = useState<UserListItem | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserDisplayName, setEditUserDisplayName] = useState('');
  const [editUserCpf, setEditUserCpf] = useState('');
  const [editUserJobTitle, setEditUserJobTitle] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<'OWNER' | 'ADMIN' | 'USER'>('USER');
  const [editUserActive, setEditUserActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});

  const [resetTargetUser, setResetTargetUser] = useState<UserListItem | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('temp1234');
  const [showAdminResetPassword, setShowAdminResetPassword] = useState(false);
  const [adminResetLoading, setAdminResetLoading] = useState(false);
  const [adminResetTouched, setAdminResetTouched] = useState(false);
  const [adminResetError, setAdminResetError] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'toggle_status' | 'delete';
    user: UserListItem;
    targetActiveState?: boolean;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Modais de Grupos
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupActive, setNewGroupActive] = useState(true);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [createGroupErrors, setCreateGroupErrors] = useState<Record<string, string>>({});
  const [createGroupTouched, setCreateGroupTouched] = useState<Record<string, boolean>>({});

  const [editTargetGroup, setEditTargetGroup] = useState<GroupListItem | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupActive, setEditGroupActive] = useState(true);
  const [editGroupLoading, setEditGroupLoading] = useState(false);
  const [editGroupErrors, setEditGroupErrors] = useState<Record<string, string>>({});
  const [editGroupTouched, setEditGroupTouched] = useState<Record<string, boolean>>({});

  const [confirmGroupAction, setConfirmGroupAction] = useState<{
    type: 'toggle_status' | 'delete';
    group: GroupListItem;
    targetActiveState?: boolean;
  } | null>(null);
  const [confirmGroupActionLoading, setConfirmGroupActionLoading] = useState(false);

  // Membros do Grupo / Grupos do Usuário
  const [manageMembersGroup, setManageMembersGroup] = useState<GroupListItem | null>(null);
  const [groupMembersData, setGroupMembersData] = useState<GroupMembersResponse | null>(null);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [selectedAddUserId, setSelectedAddUserId] = useState<string>('');
  const [groupMemberActionLoading, setGroupMemberActionLoading] = useState(false);

  const [manageGroupsUser, setManageGroupsUser] = useState<UserListItem | null>(null);
  const [userGroupsData, setUserGroupsData] = useState<UserGroupsResponse | null>(null);
  const [userGroupsLoading, setUserGroupsLoading] = useState(false);
  const [selectedAddGroupId, setSelectedAddGroupId] = useState<string>('');
  const [userGroupActionLoading, setUserGroupActionLoading] = useState(false);

  // Ordenação
  const [userSortField, setUserSortField] = useState<'full_name' | 'username' | 'is_active'>('full_name');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [groupSortField, setGroupSortField] = useState<'name' | 'is_active'>('name');
  const [groupSortOrder, setGroupSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadUsersList = () => {
    setUsersLoading(true);
    listUsers()
      .then((data) => setUsersList(data))
      .catch((err) => setUserActionError(err instanceof Error ? err.message : t('ERROR_LIST_USERS')))
      .finally(() => setUsersLoading(false));
  };

  const loadGroupsList = () => {
    setGroupsLoading(true);
    listGroups()
      .then((data) => setGroupsList(data))
      .catch((err) => setUserActionError(err instanceof Error ? err.message : t('ERROR_LIST_GROUPS')))
      .finally(() => setGroupsLoading(false));
  };

  React.useEffect(() => {
    loadUsersList();
    loadGroupsList();
  }, []);

  const handleUserSort = (field: 'full_name' | 'username' | 'is_active') => {
    if (userSortField === field) {
      setUserSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortField(field);
      setUserSortOrder('asc');
    }
  };

  const handleGroupSort = (field: 'name' | 'is_active') => {
    if (groupSortField === field) {
      setGroupSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setGroupSortField(field);
      setGroupSortOrder('asc');
    }
  };

  const sortedUsersList = useMemo(() => {
    return [...usersList].sort((a, b) => {
      let comparison = 0;
      if (userSortField === 'full_name') {
        comparison = a.full_name.localeCompare(b.full_name, SupportedLocales.PT_BR, { sensitivity: 'base' });
      } else if (userSortField === 'username') {
        comparison = a.username.localeCompare(b.username, SupportedLocales.PT_BR, { sensitivity: 'base' });
      } else if (userSortField === 'is_active') {
        comparison = a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
      }
      return userSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [usersList, userSortField, userSortOrder]);

  const sortedGroupsList = useMemo(() => {
    return [...groupsList].sort((a, b) => {
      let comparison = 0;
      if (groupSortField === 'name') {
        comparison = a.name.localeCompare(b.name, SupportedLocales.PT_BR, { sensitivity: 'base' });
      } else if (groupSortField === 'is_active') {
        comparison = a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
      }
      return groupSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [groupsList, groupSortField, groupSortOrder]);

  const validateUserField = (field: string, val: string): string => {
    switch (field) {
      case 'fullName': {
        const trimmed = val.trim();
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (!Name.isValid(trimmed)) return t('VALIDATION_ERROR_NAME_INVALID');
        return '';
      }
      case 'displayName': {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > Name.MAX_LENGTH) {
          return t('VALIDATION_ERROR_DISPLAY_NAME_INVALID');
        }
        return '';
      }
      case 'cpf': {
        const trimmed = val.trim();
        if (trimmed) {
          const cleaned = Cpf.clean(trimmed);
          if (!Cpf.isValid(cleaned)) return t('VALIDATION_ERROR_CPF_INVALID');
        }
        return '';
      }
      case 'username': {
        const trimmed = val.trim();
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (!Username.isValid(trimmed)) return t('VALIDATION_ERROR_USERNAME_INVALID');
        return '';
      }
      case 'email': {
        const trimmed = val.trim();
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (!Email.isValid(trimmed)) return t('VALIDATION_ERROR_EMAIL_INVALID');
        return '';
      }
      case 'password': {
        if (!val) return t('VALIDATION_ERROR_REQUIRED');
        if (!PasswordPolicy.isValid(val)) return t('VALIDATION_ERROR_PASSWORD_POLICY');
        return '';
      }
      default:
        return '';
    }
  };

  const validateUserForm = (values: {
    fullName: string;
    displayName?: string;
    cpf?: string;
    username: string;
    email: string;
    password?: string;
    isCreate?: boolean;
  }): Record<string, string> => {
    const errors: Record<string, string> = {};
    const fullNameErr = validateUserField('fullName', values.fullName);
    if (fullNameErr) errors.fullName = fullNameErr;

    const displayNameErr = validateUserField('displayName', values.displayName || '');
    if (displayNameErr) errors.displayName = displayNameErr;

    const cpfErr = validateUserField('cpf', values.cpf || '');
    if (cpfErr) errors.cpf = cpfErr;

    const usernameErr = validateUserField('username', values.username);
    if (usernameErr) errors.username = usernameErr;

    const emailErr = validateUserField('email', values.email);
    if (emailErr) errors.email = emailErr;

    if (values.isCreate) {
      const passwordErr = validateUserField('password', values.password || '');
      if (passwordErr) errors.password = passwordErr;
    }

    return errors;
  };

  const validateGroupField = (field: string, val: string): string => {
    switch (field) {
      case 'name': {
        const trimmed = val.trim();
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (trimmed.length < 2 || trimmed.length > 100) return t('VALIDATION_ERROR_GROUP_NAME_INVALID');
        return '';
      }
      case 'description': {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 255) return t('VALIDATION_ERROR_GROUP_DESC_INVALID');
        return '';
      }
      default:
        return '';
    }
  };

  const validateGroupForm = (values: { name: string; description?: string }): Record<string, string> => {
    const errors: Record<string, string> = {};
    const nameErr = validateGroupField('name', values.name);
    if (nameErr) errors.name = nameErr;

    const descErr = validateGroupField('description', values.description || '');
    if (descErr) errors.description = descErr;

    return errors;
  };

  const validateAdminResetPassword = (pass: string): string => {
    if (!pass) return t('VALIDATION_ERROR_REQUIRED');
    if (!PasswordPolicy.isValid(pass)) return t('VALIDATION_ERROR_PASSWORD_POLICY');
    return '';
  };

  const handleCreateBlur = (field: string) => {
    setCreateTouched((prev) => ({ ...prev, [field]: true }));
    let val = '';
    if (field === 'fullName') val = newUserName;
    else if (field === 'displayName') val = newUserDisplayName;
    else if (field === 'cpf') val = newUserCpf;
    else if (field === 'username') val = newUserUsername;
    else if (field === 'email') val = newUserEmail;
    else if (field === 'password') val = newUserPassword;
    const err = validateUserField(field, val);
    setCreateErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleEditBlur = (field: string) => {
    setEditTouched((prev) => ({ ...prev, [field]: true }));
    let val = '';
    if (field === 'fullName') val = editUserName;
    else if (field === 'displayName') val = editUserDisplayName;
    else if (field === 'cpf') val = editUserCpf;
    else if (field === 'username') val = editUserUsername;
    else if (field === 'email') val = editUserEmail;
    const err = validateUserField(field, val);
    setEditErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleCreateGroupBlur = (field: string) => {
    setCreateGroupTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === 'name' ? newGroupName : newGroupDesc;
    const err = validateGroupField(field, val);
    setCreateGroupErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleEditGroupBlur = (field: string) => {
    setEditGroupTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === 'name' ? editGroupName : editGroupDesc;
    const err = validateGroupField(field, val);
    setEditGroupErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleGeneratePassword = (target: 'create' | 'reset') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    do {
      const array = new Uint8Array(12);
      window.crypto.getRandomValues(array);
      pass = '';
      for (let i = 0; i < 12; i++) {
        pass += chars[array[i] % chars.length];
      }
    } while (!PasswordPolicy.isValid(pass));

    if (target === 'create') {
      setNewUserPassword(pass);
      setCreateErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    } else {
      setAdminNewPassword(pass);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionMsg(null);

    setCreateTouched({
      fullName: true,
      displayName: true,
      cpf: true,
      username: true,
      email: true,
      password: true,
    });

    const errors = validateUserForm({
      fullName: newUserName,
      displayName: newUserDisplayName,
      cpf: newUserCpf,
      username: newUserUsername,
      email: newUserEmail,
      password: newUserPassword,
      isCreate: true,
    });

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    const cleanedCpf = newUserCpf.trim() ? Cpf.clean(newUserCpf) : undefined;
    setCreateLoading(true);
    try {
      const res = await createUser({
        full_name: newUserName.trim(),
        display_name: newUserDisplayName.trim() || undefined,
        job_title: newUserJobTitle.trim() || undefined,
        cpf: cleanedCpf,
        email: newUserEmail.trim(),
        username: newUserUsername.trim(),
        password: newUserPassword,
        role: newUserRole,
        is_active: newUserActive,
      });
      setUserActionMsg(res.message);
      setShowCreateModal(false);
      setNewUserName('');
      setNewUserDisplayName('');
      setNewUserCpf('');
      setNewUserJobTitle('');
      setNewUserEmail('');
      setNewUserUsername('');
      setNewUserPassword('Temp@1234');
      setNewUserActive(true);
      setCreateErrors({});
      setCreateTouched({});
      loadUsersList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_CREATE_USER'));
    } finally {
      setCreateLoading(false);
    }
  };

  const startEditUser = (u: UserListItem) => {
    setEditTargetUser(u);
    setEditUserName(u.full_name);
    setEditUserDisplayName(u.display_name || '');
    setEditUserCpf(u.cpf ? Cpf.format(u.cpf) : '');
    setEditUserJobTitle(u.job_title || '');
    setEditUserUsername(u.username);
    setEditUserEmail(u.email);
    setEditUserRole(u.role);
    setEditUserActive(u.is_active);
    setEditErrors({});
    setEditTouched({});
    setShowCreateModal(false);
    setResetTargetUser(null);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;
    setUserActionError(null);
    setUserActionMsg(null);

    setEditTouched({
      fullName: true,
      displayName: true,
      cpf: true,
      username: true,
      email: true,
    });

    const errors = validateUserForm({
      fullName: editUserName,
      displayName: editUserDisplayName,
      cpf: editUserCpf,
      username: editUserUsername,
      email: editUserEmail,
      isCreate: false,
    });

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    const cleanedCpf = editUserCpf.trim() ? Cpf.clean(editUserCpf) : undefined;
    setEditLoading(true);
    try {
      const res = await updateUser(editTargetUser.id, {
        full_name: editUserName.trim(),
        display_name: editUserDisplayName.trim() || undefined,
        job_title: editUserJobTitle.trim() || undefined,
        cpf: cleanedCpf ?? null,
        username: editUserUsername.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        is_active: editUserActive,
      });
      setUserActionMsg(res.message);
      setEditTargetUser(null);
      setEditUserCpf('');
      setEditUserDisplayName('');
      setEditErrors({});
      setEditTouched({});
      loadUsersList();
      if (editTargetUser.id === currentUser?.id && onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_UPDATE_USER'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdminResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setUserActionError(null);
    setUserActionMsg(null);
    setAdminResetTouched(true);

    const err = validateAdminResetPassword(adminNewPassword);
    if (err) {
      setAdminResetError(err);
      return;
    }

    setAdminResetLoading(true);
    try {
      const res = await adminResetPassword(resetTargetUser.id, adminNewPassword);
      setUserActionMsg(res.message);
      setResetTargetUser(null);
      setAdminNewPassword('temp1234');
      setAdminResetTouched(false);
      setAdminResetError(null);
      loadUsersList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_RESET_PASSWORD'));
    } finally {
      setAdminResetLoading(false);
    }
  };

  const handleConfirmExecution = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    setUserActionError(null);
    setUserActionMsg(null);
    try {
      if (confirmAction.type === 'delete') {
        const res = await deleteUser(confirmAction.user.id);
        setUserActionMsg(res.message);
        setEditTargetUser(null);
      } else if (confirmAction.type === 'toggle_status') {
        const res = await toggleUserStatus(confirmAction.user.id);
        setUserActionMsg(res.message);
      }
      setConfirmAction(null);
      loadUsersList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_PROCESS_REQUEST'));
    } finally {
      setConfirmLoading(false);
    }
  };

  // Funções de Grupo
  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionMsg(null);

    setCreateGroupTouched({
      name: true,
      description: true,
    });

    const errors = validateGroupForm({
      name: newGroupName,
      description: newGroupDesc,
    });

    if (Object.keys(errors).length > 0) {
      setCreateGroupErrors(errors);
      return;
    }

    setCreateGroupLoading(true);
    try {
      const res = await createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        is_active: newGroupActive,
      });
      setUserActionMsg(res.message);
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupActive(true);
      setCreateGroupErrors({});
      setCreateGroupTouched({});
      loadGroupsList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_CREATE_GROUP'));
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const startEditGroup = (g: GroupListItem) => {
    setEditTargetGroup(g);
    setEditGroupName(g.name);
    setEditGroupDesc(g.description || '');
    setEditGroupActive(g.is_active);
    setEditGroupErrors({});
    setEditGroupTouched({});
    setShowCreateGroupModal(false);
  };

  const handleEditGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetGroup) return;
    setUserActionError(null);
    setUserActionMsg(null);

    setEditGroupTouched({
      name: true,
      description: true,
    });

    const errors = validateGroupForm({
      name: editGroupName,
      description: editGroupDesc,
    });

    if (Object.keys(errors).length > 0) {
      setEditGroupErrors(errors);
      return;
    }

    setEditGroupLoading(true);
    try {
      const res = await updateGroup(editTargetGroup.id, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
        is_active: editGroupActive,
      });
      setUserActionMsg(res.message);
      setEditTargetGroup(null);
      setEditGroupErrors({});
      setEditGroupTouched({});
      loadGroupsList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_UPDATE_GROUP'));
    } finally {
      setEditGroupLoading(false);
    }
  };

  const handleConfirmGroupActionExecution = async () => {
    if (!confirmGroupAction) return;
    setConfirmGroupActionLoading(true);
    setUserActionError(null);
    setUserActionMsg(null);
    try {
      if (confirmGroupAction.type === 'delete') {
        const res = await deleteGroup(confirmGroupAction.group.id);
        setUserActionMsg(res.message);
        setEditTargetGroup(null);
      } else if (confirmGroupAction.type === 'toggle_status') {
        const targetActive = confirmGroupAction.targetActiveState ?? !confirmGroupAction.group.is_active;
        const res = await updateGroup(confirmGroupAction.group.id, { is_active: targetActive });
        setUserActionMsg(res.message);
      }
      setConfirmGroupAction(null);
      loadGroupsList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_PROCESS_REQUEST'));
    } finally {
      setConfirmGroupActionLoading(false);
    }
  };

  const openManageMembers = async (g: GroupListItem) => {
    setManageMembersGroup(g);
    setGroupMembersLoading(true);
    setSelectedAddUserId('');
    try {
      const data = await getGroupMembers(g.id);
      setGroupMembersData(data);
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_LOAD_GROUP_MEMBERS'));
    } finally {
      setGroupMembersLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!manageMembersGroup || !selectedAddUserId) return;
    setGroupMemberActionLoading(true);
    try {
      await addGroupMember(manageMembersGroup.id, selectedAddUserId);
      const data = await getGroupMembers(manageMembersGroup.id);
      setGroupMembersData(data);
      setSelectedAddUserId('');
      loadGroupsList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_ADD_GROUP_MEMBER'));
    } finally {
      setGroupMemberActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!manageMembersGroup) return;
    setGroupMemberActionLoading(true);
    try {
      await removeGroupMember(manageMembersGroup.id, userId);
      const data = await getGroupMembers(manageMembersGroup.id);
      setGroupMembersData(data);
      loadGroupsList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_REMOVE_GROUP_MEMBER'));
    } finally {
      setGroupMemberActionLoading(false);
    }
  };

  const openManageUserGroups = async (u: UserListItem) => {
    setManageGroupsUser(u);
    setUserActionError(null);
    setUserGroupsLoading(true);
    setSelectedAddGroupId('');
    try {
      const data = await getUserGroups(u.id);
      setUserGroupsData(data);
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_LOAD_USER_GROUPS'));
    } finally {
      setUserGroupsLoading(false);
    }
  };

  const handleAddUserToGroup = async () => {
    if (!manageGroupsUser || !selectedAddGroupId) return;
    setUserActionError(null);
    setUserGroupActionLoading(true);
    try {
      await addUserToGroup(manageGroupsUser.id, selectedAddGroupId);
      const data = await getUserGroups(manageGroupsUser.id);
      setUserGroupsData(data);
      setSelectedAddGroupId('');
      loadGroupsList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_ADD_USER_GROUP'));
    } finally {
      setUserGroupActionLoading(false);
    }
  };

  const handleRemoveUserFromGroup = async (groupId: string) => {
    if (!manageGroupsUser) return;
    setUserActionError(null);
    setUserGroupActionLoading(true);
    try {
      await removeUserFromGroup(manageGroupsUser.id, groupId);
      const data = await getUserGroups(manageGroupsUser.id);
      setUserGroupsData(data);
      loadGroupsList();
    } catch (err) {
      setUserActionError(err instanceof Error ? err.message : t('ERROR_REMOVE_USER_GROUP'));
    } finally {
      setUserGroupActionLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const getInputStyle = (hasError?: boolean): React.CSSProperties => ({
    ...inputStyle,
    borderColor: hasError ? '#ef4444' : '#cbd5e1',
    backgroundColor: hasError ? '#fef2f2' : '#ffffff',
  });

  const renderFieldError = (error?: string) => {
    if (!error) return null;
    return (
      <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: 4, display: 'block', fontWeight: 500 }}>
        {error}
      </span>
    );
  };

  const btnStyle: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 8,
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {userActionError && (
        <AlertBanner
          type={AlertBannerType.ERROR}
          message={userActionError}
          onClose={() => setUserActionError(null)}
        />
      )}

      {userActionMsg && (
        <AlertBanner
          type={AlertBannerType.SUCCESS}
          message={userActionMsg}
          onClose={() => setUserActionMsg(null)}
        />
      )}

      {/* Header com Seletor de Sub-Abas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setAdminSubTab('users')}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: adminSubTab === 'users' ? '1px solid #0284c7' : '1px solid #cbd5e1',
              background: adminSubTab === 'users' ? '#0ea5e9' : '#f8fafc',
              color: adminSubTab === 'users' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxSizing: 'border-box',
            }}
          >
            👥 {t('TAB_USERS')} ({usersList.length})
          </button>
          <button
            type="button"
            onClick={() => setAdminSubTab('groups')}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: adminSubTab === 'groups' ? '1px solid #0284c7' : '1px solid #cbd5e1',
              background: adminSubTab === 'groups' ? '#0ea5e9' : '#f8fafc',
              color: adminSubTab === 'groups' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxSizing: 'border-box',
            }}
          >
            🏢 {t('TAB_USER_GROUPS')} ({groupsList.length})
          </button>
        </div>

        <div>
          {adminSubTab === 'users' ? (
            <button
              onClick={() => { setShowCreateModal(true); setResetTargetUser(null); setEditTargetUser(null); }}
              style={{
                ...btnStyle,
                background: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 38,
                padding: '0 18px',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            >
              ➕ {t('BTN_NEW_USER')}
            </button>
          ) : (
            <button
              onClick={() => { setShowCreateGroupModal(true); setEditTargetGroup(null); }}
              style={{
                ...btnStyle,
                background: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 38,
                padding: '0 18px',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            >
              ➕ {t('BTN_NEW_GROUP')}
            </button>
          )}
        </div>
      </div>

      {/* SUB-ABA 1: USUÁRIOS */}
      {adminSubTab === 'users' && (
        <>
          {/* Modal Criar Usuário */}
          {showCreateModal && (
            <div style={{ background: '#fff', border: '2px solid #38bdf8', borderRadius: 12, padding: 22, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>{t('MODAL_CREATE_USER_TITLE')}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ToggleSwitch checked={newUserActive} onChange={(val) => setNewUserActive(val)} />
                  <button onClick={() => { setShowCreateModal(false); setCreateErrors({}); setCreateTouched({}); }} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
                </div>
              </div>

              <form onSubmit={handleCreateUserSubmit} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                {/* Linha 1: Nome Completo, Nome Usual, Cargo / Função */}
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_FULL_NAME_LABEL')} tooltip={t('FIELD_FULL_NAME_TOOLTIP')} required />
                  <input
                    type="text"
                    value={newUserName}
                    onBlur={() => handleCreateBlur('fullName')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUserName(val);
                      if (createTouched.fullName || createErrors.fullName) {
                        const err = validateUserField('fullName', val);
                        setCreateErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.fullName = err;
                          else delete next.fullName;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!createErrors.fullName)}
                  />
                  {renderFieldError(createErrors.fullName)}
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_DISPLAY_NAME_LABEL')} tooltip={t('FIELD_DISPLAY_NAME_TOOLTIP')} />
                  <input
                    type="text"
                    value={newUserDisplayName}
                    onBlur={() => handleCreateBlur('displayName')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUserDisplayName(val);
                      if (createTouched.displayName || createErrors.displayName) {
                        const err = validateUserField('displayName', val);
                        setCreateErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.displayName = err;
                          else delete next.displayName;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!createErrors.displayName)}
                  />
                  {renderFieldError(createErrors.displayName)}
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_JOB_TITLE_LABEL')} tooltip={t('FIELD_JOB_TITLE_TOOLTIP')} />
                  <input
                    type="text"
                    value={newUserJobTitle}
                    onChange={(e) => setNewUserJobTitle(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Linha 2: CPF (menor largura), Nome de Usuário, E-mail, Perfil de Acesso */}
                <div style={{ gridColumn: 'span 2' }}>
                  <FieldLabelWithTooltip label={t('FIELD_CPF_LABEL')} tooltip={t('FIELD_CPF_TOOLTIP')} />
                  <input
                    type="text"
                    value={newUserCpf}
                    onBlur={() => handleCreateBlur('cpf')}
                    onChange={(e) => {
                      const formatted = Cpf.format(e.target.value);
                      setNewUserCpf(formatted);
                      if (createTouched.cpf || createErrors.cpf) {
                        const err = validateUserField('cpf', formatted);
                        setCreateErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.cpf = err;
                          else delete next.cpf;
                          return next;
                        });
                      }
                    }}
                    placeholder={t('FIELD_CPF_PLACEHOLDER')}
                    maxLength={14}
                    style={{ ...getInputStyle(!!createErrors.cpf), padding: '10px 10px' }}
                  />
                  {renderFieldError(createErrors.cpf)}
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <FieldLabelWithTooltip label={t('FIELD_USERNAME_LABEL')} tooltip={t('FIELD_USERNAME_TOOLTIP')} required />
                  <input
                    type="text"
                    value={newUserUsername}
                    onBlur={() => handleCreateBlur('username')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUserUsername(val);
                      if (createTouched.username || createErrors.username) {
                        const err = validateUserField('username', val);
                        setCreateErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.username = err;
                          else delete next.username;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!createErrors.username)}
                  />
                  {renderFieldError(createErrors.username)}
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_EMAIL_LABEL')} tooltip={t('FIELD_EMAIL_TOOLTIP')} required />
                  <input
                    type="email"
                    value={newUserEmail}
                    onBlur={() => handleCreateBlur('email')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUserEmail(val);
                      if (createTouched.email || createErrors.email) {
                        const err = validateUserField('email', val);
                        setCreateErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.email = err;
                          else delete next.email;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!createErrors.email)}
                  />
                  {renderFieldError(createErrors.email)}
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <FieldLabelWithTooltip label={t('FIELD_ROLE_LABEL')} tooltip={t('FIELD_ROLE_TOOLTIP')} required />
                  <select
                    id="create-user-role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    style={inputStyle}
                  >
                    <option value={UserRole.USER}>{t('ROLE_OPTION_USER')} ({UserRole.USER})</option>
                    <option value={UserRole.ADMIN}>{t('ROLE_OPTION_ADMIN')} ({UserRole.ADMIN})</option>
                    {currentUser?.role === UserRole.OWNER && <option value={UserRole.OWNER}>{t('ROLE_OPTION_OWNER')} ({UserRole.OWNER})</option>}
                  </select>
                </div>

                {/* Linha 3: Senha de Acesso */}
                <div style={{ gridColumn: 'span 12' }}>
                  <FieldLabelWithTooltip label={t('FIELD_PASSWORD_LABEL')} tooltip={t('FIELD_PASSWORD_TOOLTIP')} required />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewUserPassword ? 'text' : 'password'}
                      value={newUserPassword}
                      onBlur={() => handleCreateBlur('password')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewUserPassword(val);
                        if (createTouched.password || createErrors.password) {
                          const err = validateUserField('password', val);
                          setCreateErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.password = err;
                            else delete next.password;
                            return next;
                          });
                        }
                      }}
                      style={{ ...getInputStyle(!!createErrors.password), paddingRight: 116 }}
                    />
                    <div style={{ position: 'absolute', right: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword((prev) => !prev)}
                        title={showNewUserPassword ? t('BTN_PASSWORD_HIDE') : t('BTN_PASSWORD_SHOW')}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showNewUserPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGeneratePassword('create')}
                        title={t('TOOLTIP_GENERATE_PASSWORD')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ {t('BTN_GENERATE_PASSWORD')}
                      </button>
                    </div>
                  </div>
                  {renderFieldError(createErrors.password)}
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" onClick={() => { setShowCreateModal(false); setCreateErrors({}); setCreateTouched({}); }} style={{ ...btnStyle, background: '#e2e8f0', color: '#334155' }}>
                    {t('BTN_CANCEL')}
                  </button>
                  <button type="submit" disabled={createLoading} style={{ ...btnStyle, background: '#16a34a', opacity: createLoading ? 0.7 : 1 }}>
                    {createLoading ? t('BTN_PROCESSING') : t('BTN_CREATE_USER')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal Editar Usuário */}
          {editTargetUser && (
            <div style={{ background: '#fff', border: '2px solid #3b82f6', borderRadius: 12, padding: 22, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>
                  ✏️ {t('MODAL_EDIT_USER_TITLE')}: <strong>{editTargetUser.full_name}</strong>
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ToggleSwitch
                    checked={editUserActive}
                    onChange={(val) => setEditUserActive(val)}
                    disabled={currentUser?.id === editTargetUser.id}
                  />
                  <button onClick={() => { setEditTargetUser(null); setEditErrors({}); setEditTouched({}); }} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
                </div>
              </div>

              <form onSubmit={handleEditUserSubmit} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                {/* Linha 1: Nome Completo, Nome Usual, Cargo / Função */}
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_FULL_NAME_LABEL')} tooltip={t('FIELD_FULL_NAME_TOOLTIP')} required />
                  <input
                    type="text"
                    value={editUserName}
                    onBlur={() => handleEditBlur('fullName')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditUserName(val);
                      if (editTouched.fullName || editErrors.fullName) {
                        const err = validateUserField('fullName', val);
                        setEditErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.fullName = err;
                          else delete next.fullName;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!editErrors.fullName)}
                  />
                  {renderFieldError(editErrors.fullName)}
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_DISPLAY_NAME_LABEL')} tooltip={t('FIELD_DISPLAY_NAME_TOOLTIP')} />
                  <input
                    type="text"
                    value={editUserDisplayName}
                    onBlur={() => handleEditBlur('displayName')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditUserDisplayName(val);
                      if (editTouched.displayName || editErrors.displayName) {
                        const err = validateUserField('displayName', val);
                        setEditErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.displayName = err;
                          else delete next.displayName;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!editErrors.displayName)}
                  />
                  {renderFieldError(editErrors.displayName)}
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_JOB_TITLE_LABEL')} tooltip={t('FIELD_JOB_TITLE_TOOLTIP')} />
                  <input
                    type="text"
                    value={editUserJobTitle}
                    onChange={(e) => setEditUserJobTitle(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Linha 2: CPF (menor largura), Nome de Usuário, E-mail, Perfil de Acesso */}
                <div style={{ gridColumn: 'span 2' }}>
                  <FieldLabelWithTooltip label={t('FIELD_CPF_LABEL')} tooltip={t('FIELD_CPF_TOOLTIP')} />
                  <input
                    type="text"
                    value={editUserCpf}
                    onBlur={() => handleEditBlur('cpf')}
                    onChange={(e) => {
                      const formatted = Cpf.format(e.target.value);
                      setEditUserCpf(formatted);
                      if (editTouched.cpf || editErrors.cpf) {
                        const err = validateUserField('cpf', formatted);
                        setEditErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.cpf = err;
                          else delete next.cpf;
                          return next;
                        });
                      }
                    }}
                    placeholder={t('FIELD_CPF_PLACEHOLDER')}
                    maxLength={14}
                    style={{ ...getInputStyle(!!editErrors.cpf), padding: '10px 10px' }}
                  />
                  {renderFieldError(editErrors.cpf)}
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <FieldLabelWithTooltip label={t('FIELD_USERNAME_LABEL')} tooltip={t('FIELD_USERNAME_TOOLTIP')} required />
                  <input
                    type="text"
                    value={editUserUsername}
                    onBlur={() => handleEditBlur('username')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditUserUsername(val);
                      if (editTouched.username || editErrors.username) {
                        const err = validateUserField('username', val);
                        setEditErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.username = err;
                          else delete next.username;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!editErrors.username)}
                  />
                  {renderFieldError(editErrors.username)}
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <FieldLabelWithTooltip label={t('FIELD_EMAIL_LABEL')} tooltip={t('FIELD_EMAIL_TOOLTIP')} required />
                  <input
                    type="email"
                    value={editUserEmail}
                    onBlur={() => handleEditBlur('email')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditUserEmail(val);
                      if (editTouched.email || editErrors.email) {
                        const err = validateUserField('email', val);
                        setEditErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.email = err;
                          else delete next.email;
                          return next;
                        });
                      }
                    }}
                    style={getInputStyle(!!editErrors.email)}
                  />
                  {renderFieldError(editErrors.email)}
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <FieldLabelWithTooltip label={t('FIELD_ROLE_LABEL')} tooltip={t('FIELD_ROLE_TOOLTIP')} required />
                  <select
                    id="edit-user-role"
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as any)}
                    style={inputStyle}
                  >
                    <option value={UserRole.USER}>{t('ROLE_OPTION_USER')} ({UserRole.USER})</option>
                    <option value={UserRole.ADMIN}>{t('ROLE_OPTION_ADMIN')} ({UserRole.ADMIN})</option>
                    {currentUser?.role === UserRole.OWNER && <option value={UserRole.OWNER}>{t('ROLE_OPTION_OWNER')} ({UserRole.OWNER})</option>}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <button
                    type="button"
                    disabled={currentUser?.id === editTargetUser.id || editTargetUser.is_active}
                    onClick={() => setConfirmAction({ type: 'delete', user: editTargetUser })}
                    title={
                      currentUser?.id === editTargetUser.id
                        ? t('TOOLTIP_CANNOT_DELETE_SELF')
                        : editTargetUser.is_active
                        ? t('TOOLTIP_DEACTIVATE_BEFORE_DELETE')
                        : t('TOOLTIP_DELETE_PERMANENT')
                    }
                    style={{
                      ...btnStyle,
                      border: currentUser?.id === editTargetUser.id || editTargetUser.is_active ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                      background: currentUser?.id === editTargetUser.id || editTargetUser.is_active ? '#f1f5f9' : '#fee2e2',
                      color: currentUser?.id === editTargetUser.id || editTargetUser.is_active ? '#94a3b8' : '#dc2626',
                      opacity: currentUser?.id === editTargetUser.id || editTargetUser.is_active ? 0.6 : 1,
                      cursor: currentUser?.id === editTargetUser.id || editTargetUser.is_active ? 'not-allowed' : 'pointer',
                    }}
                  >
                    🗑️ {t('BTN_DELETE_USER')}
                  </button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => { setEditTargetUser(null); setEditErrors({}); setEditTouched({}); }} style={{ ...btnStyle, background: '#e2e8f0', color: '#334155' }}>
                      {t('BTN_CANCEL')}
                    </button>
                    <button type="submit" disabled={editLoading} style={{ ...btnStyle, background: '#2563eb', opacity: editLoading ? 0.7 : 1 }}>
                      {editLoading ? t('BTN_PROCESSING') : t('BTN_SAVE')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Modal Alterar Senha de Usuário */}
          {resetTargetUser && (
            <div style={{ background: '#fff', border: '2px solid #eab308', borderRadius: 12, padding: 22, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>
                  🔑 {t('MODAL_ADMIN_RESET_PASSWORD_TITLE')}: <strong>{resetTargetUser.full_name}</strong>
                </h4>
                <button onClick={() => { setResetTargetUser(null); setAdminResetTouched(false); setAdminResetError(null); }} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
              </div>

              <form onSubmit={handleAdminResetPasswordSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: '25%', minWidth: 280 }}>
                  <FieldLabelWithTooltip label={t('FIELD_NEW_PASSWORD_LABEL')} tooltip={t('FIELD_NEW_PASSWORD_TOOLTIP')} required />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showAdminResetPassword ? 'text' : 'password'}
                      value={adminNewPassword}
                      onBlur={() => {
                        setAdminResetTouched(true);
                        const err = validateAdminResetPassword(adminNewPassword);
                        setAdminResetError(err || null);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdminNewPassword(val);
                        if (adminResetTouched || adminResetError) {
                          const err = validateAdminResetPassword(val);
                          setAdminResetError(err || null);
                        }
                      }}
                      style={{ ...getInputStyle(!!adminResetError), paddingRight: 116, width: '100%' }}
                    />
                    <div style={{ position: 'absolute', right: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowAdminResetPassword((prev) => !prev)}
                        title={showAdminResetPassword ? 'Ocultar senha' : 'Exibir senha'}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showAdminResetPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGeneratePassword('reset')}
                        title={t('TOOLTIP_GENERATE_PASSWORD')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ {t('BTN_GENERATE_PASSWORD')}
                      </button>
                    </div>
                  </div>
                  {renderFieldError(adminResetError || undefined)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => { setResetTargetUser(null); setAdminResetTouched(false); setAdminResetError(null); }} style={{ ...btnStyle, background: '#e2e8f0', color: '#334155' }}>
                    {t('BTN_CANCEL')}
                  </button>
                  <button type="submit" disabled={adminResetLoading} style={{ ...btnStyle, background: '#eab308', color: '#0f172a', opacity: adminResetLoading ? 0.7 : 1 }}>
                    {adminResetLoading ? t('BTN_PROCESSING') : t('BTN_CONFIRM')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabela de Usuários */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: 700 }}>
                {t('USERS_MANAGEMENT_TITLE')}
              </h4>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                {t('USERS_MANAGEMENT_SUBTITLE')}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem' }}>
                    <th onClick={() => handleUserSort('full_name')} style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none' }}>
                      {t('TABLE_HEADER_NAME')} {userSortField === 'full_name' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th onClick={() => handleUserSort('username')} style={{ padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}>
                      {t('TABLE_HEADER_USERNAME')} {userSortField === 'username' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_EMAIL')}</th>
                    <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_ROLE')}</th>
                    <th onClick={() => handleUserSort('is_active')} style={{ padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}>
                      {t('TABLE_HEADER_STATUS')} {userSortField === 'is_active' ? (userSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={{ padding: '10px 16px', textAlign: 'left' }}>{t('TABLE_HEADER_ACTIONS')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{u.full_name}</span>
                          {u.display_name && u.display_name.trim() !== u.full_name.trim() && (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                              ({u.display_name})
                            </span>
                          )}
                          {u.id === currentUser?.id && (
                            <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              {t('BADGE_YOU')}
                            </span>
                          )}
                        </div>
                        {u.job_title && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 500 }} title={t('FIELD_JOB_TITLE_LABEL')}>
                              💼 {u.job_title}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155' }}><code>{u.username}</code></td>
                      <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.82rem' }}>{u.email}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {(() => {
                          const roleMeta = ROLE_BADGE_STYLES[u.role as UserRole] ?? ROLE_BADGE_STYLES[UserRole.USER];
                          return (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: roleMeta.bg,
                              color: roleMeta.color,
                              border: roleMeta.border,
                              display: 'inline-block',
                            }}>
                              {t(roleMeta.labelKey as any)}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: u.is_active ? '#f0fdf4' : '#fff7ed',
                          color: u.is_active ? '#15803d' : '#ea580c',
                          border: u.is_active ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                          display: 'inline-block',
                        }}>
                          {u.is_active ? t('STATUS_ACTIVE') : t('STATUS_INACTIVE')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => startEditUser(u)}
                            title={t('TOOLTIP_EDIT_USER')}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            ✏️ {t('BTN_EDIT')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetTargetUser(u)}
                            title={t('TOOLTIP_RESET_USER_PASS')}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#b45309', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            🔑 {t('BTN_PASSWORD_SHORT')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openManageUserGroups(u)}
                            title={t('TOOLTIP_MANAGE_GROUPS')}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            🏢 {t('BTN_MANAGE_GROUPS')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenUserPermissions(u)}
                            title={t('TOOLTIP_MANAGE_PERMISSIONS')}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0284c7', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            🔐 {t('TH_PERMISSIONS')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SUB-ABA 2: GRUPOS DE USUÁRIOS */}
      {adminSubTab === 'groups' && (
        <>
          {/* Modal Criar Grupo */}
          {showCreateGroupModal && (
            <div style={{ background: '#fff', border: '2px solid #38bdf8', borderRadius: 12, padding: 22, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>{t('MODAL_CREATE_GROUP_TITLE')}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ToggleSwitch checked={newGroupActive} onChange={(val) => setNewGroupActive(val)} />
                  <button onClick={() => { setShowCreateGroupModal(false); setCreateGroupErrors({}); setCreateGroupTouched({}); }} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
                </div>
              </div>

              <form onSubmit={handleCreateGroupSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: '50%', minWidth: 280 }}>
                  <FieldLabelWithTooltip label={t('FIELD_GROUP_NAME')} tooltip={t('TOOLTIP_GROUP_NAME')} required />
                  <input
                    type="text"
                    value={newGroupName}
                    onBlur={() => handleCreateGroupBlur('name')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewGroupName(val);
                      if (createGroupTouched.name || createGroupErrors.name) {
                        const err = validateGroupField('name', val);
                        setCreateGroupErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.name = err;
                          else delete next.name;
                          return next;
                        });
                      }
                    }}
                    maxLength={100}
                    style={getInputStyle(!!createGroupErrors.name)}
                  />
                  {renderFieldError(createGroupErrors.name)}
                </div>
                <div>
                  <FieldLabelWithTooltip label={t('FIELD_GROUP_DESC')} tooltip={t('TOOLTIP_GROUP_DESC')} />
                  <textarea
                    rows={3}
                    value={newGroupDesc}
                    onBlur={() => handleCreateGroupBlur('description')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewGroupDesc(val);
                      if (createGroupTouched.description || createGroupErrors.description) {
                        const err = validateGroupField('description', val);
                        setCreateGroupErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.description = err;
                          else delete next.description;
                          return next;
                        });
                      }
                    }}
                    style={{ ...getInputStyle(!!createGroupErrors.description), resize: 'vertical', minHeight: 72 }}
                  />
                  {renderFieldError(createGroupErrors.description)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                  <button type="button" onClick={() => { setShowCreateGroupModal(false); setCreateGroupErrors({}); setCreateGroupTouched({}); }} style={{ ...btnStyle, background: '#e2e8f0', color: '#334155' }}>
                    {t('BTN_CANCEL')}
                  </button>
                  <button type="submit" disabled={createGroupLoading} style={{ ...btnStyle, background: '#16a34a', opacity: createGroupLoading ? 0.7 : 1 }}>
                    {createGroupLoading ? t('BTN_PROCESSING') : t('BTN_CREATE_GROUP')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal Editar Grupo */}
          {editTargetGroup && (
            <div style={{ background: '#fff', border: '2px solid #3b82f6', borderRadius: 12, padding: 22, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>
                  ✏️ {t('MODAL_EDIT_GROUP_TITLE')}: <strong>{editTargetGroup.name}</strong>
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ToggleSwitch
                    checked={editGroupActive}
                    onChange={(val) => setEditGroupActive(val)}
                    disabled={editTargetGroup.is_default}
                  />
                  <button onClick={() => { setEditTargetGroup(null); setEditGroupErrors({}); setEditGroupTouched({}); }} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
                </div>
              </div>

              <form onSubmit={handleEditGroupSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: '50%', minWidth: 280 }}>
                  <FieldLabelWithTooltip label={t('FIELD_GROUP_NAME')} tooltip={t('TOOLTIP_GROUP_NAME')} required />
                  <input
                    type="text"
                    value={editGroupName}
                    onBlur={() => handleEditGroupBlur('name')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditGroupName(val);
                      if (editGroupTouched.name || editGroupErrors.name) {
                        const err = validateGroupField('name', val);
                        setEditGroupErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.name = err;
                          else delete next.name;
                          return next;
                        });
                      }
                    }}
                    maxLength={100}
                    style={getInputStyle(!!editGroupErrors.name)}
                  />
                  {renderFieldError(editGroupErrors.name)}
                </div>
                <div>
                  <FieldLabelWithTooltip label={t('FIELD_GROUP_DESC')} tooltip={t('TOOLTIP_GROUP_DESC')} />
                  <textarea
                    rows={3}
                    value={editGroupDesc}
                    onBlur={() => handleEditGroupBlur('description')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditGroupDesc(val);
                      if (editGroupTouched.description || editGroupErrors.description) {
                        const err = validateGroupField('description', val);
                        setEditGroupErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.description = err;
                          else delete next.description;
                          return next;
                        });
                      }
                    }}
                    style={{ ...getInputStyle(!!editGroupErrors.description), resize: 'vertical', minHeight: 72 }}
                  />
                  {renderFieldError(editGroupErrors.description)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <button
                    type="button"
                    disabled={editTargetGroup.is_active || editTargetGroup.is_default}
                    onClick={() => setConfirmGroupAction({ type: 'delete', group: editTargetGroup })}
                    title={
                      editTargetGroup.is_default
                        ? t('TOOLTIP_CANNOT_DELETE_DEFAULT_GROUP')
                        : editTargetGroup.is_active
                        ? t('TOOLTIP_DEACTIVATE_GROUP_BEFORE_DELETE')
                        : t('TOOLTIP_DELETE_GROUP_PERMANENT')
                    }
                    style={{
                      ...btnStyle,
                      border: editTargetGroup.is_active || editTargetGroup.is_default ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                      background: editTargetGroup.is_active || editTargetGroup.is_default ? '#f1f5f9' : '#fee2e2',
                      color: editTargetGroup.is_active || editTargetGroup.is_default ? '#94a3b8' : '#dc2626',
                      opacity: editTargetGroup.is_active || editTargetGroup.is_default ? 0.6 : 1,
                      cursor: editTargetGroup.is_active || editTargetGroup.is_default ? 'not-allowed' : 'pointer',
                    }}
                  >
                    🗑️ {t('BTN_DELETE_GROUP')}
                  </button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => { setEditTargetGroup(null); setEditGroupErrors({}); setEditGroupTouched({}); }} style={{ ...btnStyle, background: '#e2e8f0', color: '#334155' }}>
                      {t('BTN_CANCEL')}
                    </button>
                    <button type="submit" disabled={editGroupLoading} style={{ ...btnStyle, background: '#2563eb', opacity: editGroupLoading ? 0.7 : 1 }}>
                      {editGroupLoading ? t('BTN_PROCESSING') : t('BTN_SAVE')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Tabela de Grupos */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: 700 }}>
                {t('TAB_USER_GROUPS')}
              </h4>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                Gerenciamento de grupos e perfis de permissão
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem' }}>
                    <th onClick={() => handleGroupSort('name')} style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none' }}>
                      {t('TH_GROUP_NAME')} {groupSortField === 'name' ? (groupSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={{ padding: '10px 14px' }}>{t('TH_GROUP_DESC')}</th>
                    <th style={{ padding: '10px 14px' }}>{t('TH_GROUP_MEMBERS')}</th>
                    <th onClick={() => handleGroupSort('is_active')} style={{ padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}>
                      {t('TABLE_HEADER_STATUS')} {groupSortField === 'is_active' ? (groupSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={{ padding: '10px 16px', textAlign: 'left' }}>{t('TABLE_HEADER_ACTIONS')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroupsList.map((g) => (
                    <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{g.name}</span>
                          {g.is_default && (
                            <span style={{ fontSize: '0.68rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              {t('BADGE_DEFAULT')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{g.description || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700 }}>
                          👥 {g.member_count ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: g.is_active ? '#f0fdf4' : '#fff7ed',
                          color: g.is_active ? '#15803d' : '#ea580c',
                          border: g.is_active ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                          display: 'inline-block',
                        }}>
                          {g.is_active ? t('STATUS_ACTIVE') : t('STATUS_INACTIVE')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => startEditGroup(g)}
                            title={t('TOOLTIP_EDIT_GROUP')}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            ✏️ {t('BTN_EDIT')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openManageMembers(g)}
                            title={t('TH_GROUP_MEMBERS')}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            👥 {t('TH_GROUP_MEMBERS')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenGroupPermissions(g)}
                            title={t('TOOLTIP_MANAGE_GROUP_PERMISSIONS')}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0284c7', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            🔐 {t('TH_PERMISSIONS')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Gerenciar Membros do Grupo */}
      {manageMembersGroup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 560, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                  👥 {t('MODAL_GROUP_MEMBERS_TITLE')}: <strong>{manageMembersGroup.name}</strong>
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{manageMembersGroup.description}</div>
              </div>
              <button onClick={() => setManageMembersGroup(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>

            {/* Adicionar Usuário ao Grupo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <select
                value={selectedAddUserId}
                onChange={(e) => setSelectedAddUserId(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                disabled={groupMembersLoading || !groupMembersData?.available_users?.length}
              >
                <option value="">{groupMembersData?.available_users?.length ? t('SELECT_USER_TO_ADD') : t('NO_USERS_AVAILABLE')}</option>
                {[...(groupMembersData?.available_users || [])]
                  .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' }))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.username}) - {u.role}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedAddUserId || groupMemberActionLoading}
                style={{ ...btnStyle, background: '#16a34a', padding: '8px 16px', opacity: !selectedAddUserId || groupMemberActionLoading ? 0.6 : 1 }}
              >
                ➕ {groupMemberActionLoading ? '...' : t('BTN_ADD_MEMBER_ACTION')}
              </button>
            </div>

            {/* Lista de Membros Atuais */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {groupMembersLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>{t('LOADING_MEMBERS')}</div>
              ) : groupMembersData?.members?.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>{t('EMPTY_GROUP_MEMBERS')}</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <tbody>
                    {[...(groupMembersData?.members || [])]
                      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' }))
                      .map((m) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{m.full_name}</td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}><code>{m.username}</code></td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {manageMembersGroup.is_default ? (
                              <span
                                style={{ padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block' }}
                                title={t('TOOLTIP_CANNOT_REMOVE_DEFAULT_GROUP_MEMBER')}
                              >
                                🔒 {t('BADGE_DEFAULT_LOCKED')}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.id)}
                                disabled={groupMemberActionLoading}
                                style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', cursor: 'pointer' }}
                              >
                                {t('BTN_REMOVE')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Grupos do Usuário */}
      {manageGroupsUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 560, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                  🏢 {t('MODAL_USER_GROUPS_TITLE')}: <strong>{manageGroupsUser.full_name}</strong>
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{t('LABEL_LOGIN_PREFIX')}: <code>{manageGroupsUser.username}</code></span>
                  {manageGroupsUser.job_title && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#0284c7', fontWeight: 600 }}>💼 {manageGroupsUser.job_title}</span>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setManageGroupsUser(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>

            {/* Adicionar a um Grupo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <select
                value={selectedAddGroupId}
                onChange={(e) => setSelectedAddGroupId(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                disabled={userGroupsLoading || !userGroupsData?.available_groups?.length}
              >
                <option value="">{userGroupsData?.available_groups?.length ? t('SELECT_GROUP_TO_LINK') : t('NO_GROUPS_AVAILABLE')}</option>
                {[...(userGroupsData?.available_groups || [])]
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
                  .map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddUserToGroup}
                disabled={!selectedAddGroupId || userGroupActionLoading}
                style={{ ...btnStyle, background: '#16a34a', padding: '8px 16px', opacity: !selectedAddGroupId || userGroupActionLoading ? 0.6 : 1 }}
              >
                ➕ {t('BTN_LINK_GROUP_SHORT')}
              </button>
            </div>

            {/* Grupos Vinculados */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {userGroupsLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>{t('LOADING_GROUPS')}</div>
              ) : userGroupsData?.groups?.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>{t('EMPTY_USER_GROUPS')}</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <tbody>
                    {[...(userGroupsData?.groups || [])]
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
                      .map((g) => (
                        <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{g.name}</span>
                              {g.is_default && (
                                <span style={{ fontSize: '0.68rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                  {t('BADGE_DEFAULT')}
                                </span>
                              )}
                            </div>
                            {g.description && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                {g.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', verticalAlign: 'middle', width: 90 }}>
                            {g.is_default ? (
                              <span
                                style={{ padding: '4px 8px', borderRadius: 6, background: '#f1f5f9', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block' }}
                                title={t('TOOLTIP_CANNOT_UNLINK_DEFAULT_GROUP')}
                              >
                                🔒 {t('BADGE_DEFAULT_LOCKED')}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveUserFromGroup(g.id)}
                                disabled={userGroupActionLoading}
                                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                              >
                                {t('BTN_UNLINK')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Crítica (Usuário) */}
      {confirmAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 440, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
              {confirmAction.type === 'delete' ? t('CONFIRM_DELETE_TITLE') : confirmAction.targetActiveState ? t('CONFIRM_ACTIVATE_TITLE') : t('CONFIRM_DEACTIVATE_TITLE')}
            </h4>
            <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
              {confirmAction.type === 'delete'
                ? t('CONFIRM_DELETE_QUESTION', { name: confirmAction.user.full_name })
                : confirmAction.targetActiveState
                ? t('CONFIRM_ACTIVATE_QUESTION', { name: confirmAction.user.full_name })
                : t('CONFIRM_DEACTIVATE_QUESTION', { name: confirmAction.user.full_name })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmAction(null)} style={{ ...btnStyle, background: '#e2e8f0', color: '#334155' }}>
                {t('BTN_CANCEL')}
              </button>
              <button onClick={handleConfirmExecution} disabled={confirmLoading} style={{ ...btnStyle, background: confirmAction.type === 'delete' || !confirmAction.targetActiveState ? '#dc2626' : '#16a34a' }}>
                {confirmLoading ? t('BTN_PROCESSING') : t('BTN_CONFIRM')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Crítica (Grupo) */}
      {confirmGroupAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 440, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
              {confirmGroupAction.type === 'delete' ? t('CONFIRM_DELETE_GROUP_TITLE') : confirmGroupAction.targetActiveState ? t('CONFIRM_ACTIVATE_GROUP_TITLE') : t('CONFIRM_DEACTIVATE_GROUP_TITLE')}
            </h4>
            <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
              {confirmGroupAction.type === 'delete'
                ? t('CONFIRM_DELETE_GROUP_QUESTION', { name: confirmGroupAction.group.name })
                : confirmGroupAction.targetActiveState
                ? t('CONFIRM_ACTIVATE_GROUP_QUESTION', { name: confirmGroupAction.group.name })
                : t('CONFIRM_DEACTIVATE_GROUP_QUESTION', { name: confirmGroupAction.group.name })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmGroupAction(null)} style={{ ...btnStyle, background: '#e2e8f0', color: '#334155' }}>
                {t('BTN_CANCEL')}
              </button>
              <button onClick={handleConfirmGroupActionExecution} disabled={confirmGroupActionLoading} style={{ ...btnStyle, background: confirmGroupAction.type === 'delete' || !confirmGroupAction.targetActiveState ? '#dc2626' : '#16a34a' }}>
                {confirmGroupActionLoading ? t('BTN_PROCESSING') : t('BTN_CONFIRM')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
