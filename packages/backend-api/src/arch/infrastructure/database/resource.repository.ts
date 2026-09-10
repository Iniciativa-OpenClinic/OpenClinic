import { eq, and, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sysApplicationResources } from './drizzle-schema.js';
import type { UserRole, ApplicationContext, ResourceType } from '@openclinic/core';

export interface ApplicationResourceRecord {
  id: string;
  item_code: string;
  resource_type: ResourceType;
  context: ApplicationContext;
  description: string | null;
  parent_id: string | null;
  path: string | null;
  label_key: string | null;
  icon: string | null;
  route: string | null;
  sort_order: number;
  min_role: UserRole;
  is_active: boolean;
  application_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MenuItemDTO {
  id: string;
  item_code: string;
  label: string;
  icon: string | null;
  route: string | null;
  sort_order: number;
  min_role: UserRole;
  description: string | null;
}

export interface ResourceTreeNode extends ApplicationResourceRecord {
  children?: ResourceTreeNode[];
}

const ROLE_LEVEL: Record<string, number> = {
  USER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export class ResourceRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listAll(limit = 1000): Promise<ApplicationResourceRecord[]> {
    const results = await this.db
      .select()
      .from(sysApplicationResources)
      .where(eq(sysApplicationResources.is_active, true))
      .orderBy(asc(sysApplicationResources.sort_order))
      .limit(limit);

    return results as ApplicationResourceRecord[];
  }

  async listByContext(context: ApplicationContext): Promise<ApplicationResourceRecord[]> {
    const results = await this.db
      .select()
      .from(sysApplicationResources)
      .where(
        and(
          eq(sysApplicationResources.context, context),
          eq(sysApplicationResources.is_active, true)
        )
      )
      .orderBy(asc(sysApplicationResources.sort_order));

    return results as ApplicationResourceRecord[];
  }

  async getById(id: string): Promise<ApplicationResourceRecord | null> {
    const [result] = await this.db
      .select()
      .from(sysApplicationResources)
      .where(eq(sysApplicationResources.id, id))
      .limit(1);

    return (result as ApplicationResourceRecord) ?? null;
  }

  async getByItemCode(itemCode: string): Promise<ApplicationResourceRecord | null> {
    const [result] = await this.db
      .select()
      .from(sysApplicationResources)
      .where(eq(sysApplicationResources.item_code, itemCode))
      .limit(1);

    return (result as ApplicationResourceRecord) ?? null;
  }

  async getTree(context?: ApplicationContext): Promise<ResourceTreeNode[]> {
    const resources = context
      ? await this.listByContext(context)
      : await this.listAll();

    const nodeMap = new Map<string, ResourceTreeNode>();
    const roots: ResourceTreeNode[] = [];

    for (const r of resources) {
      nodeMap.set(r.id, { ...r, children: [] });
    }

    for (const r of resources) {
      const node = nodeMap.get(r.id)!;
      if (r.parent_id && nodeMap.has(r.parent_id)) {
        nodeMap.get(r.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async listMenusForRole(role: UserRole): Promise<MenuItemDTO[]> {
    const allMenus = await this.db
      .select()
      .from(sysApplicationResources)
      .where(
        and(
          eq(sysApplicationResources.resource_type, 'MENU'),
          eq(sysApplicationResources.is_active, true)
        )
      )
      .orderBy(asc(sysApplicationResources.sort_order));

    const userLevel = ROLE_LEVEL[role] ?? 1;

    // Deduplica por item_code mantendo a primeira ocorrência
    const seen = new Set<string>();
    const uniqueMenus: typeof allMenus = [];
    for (const m of allMenus) {
      if (!seen.has(m.item_code)) {
        seen.add(m.item_code);
        uniqueMenus.push(m);
      }
    }

    // Filtra pelo nível de role RBAC
    const allowed = uniqueMenus.filter((m) => {
      const requiredLevel = ROLE_LEVEL[m.min_role as string] ?? 1;
      return userLevel >= requiredLevel;
    });

    return allowed.map((m) => ({
      id: m.id,
      item_code: m.item_code,
      label: m.label_key ?? m.item_code,
      icon: m.icon,
      route: m.route,
      sort_order: m.sort_order,
      min_role: m.min_role as UserRole,
      description: m.description,
    }));
  }
}
