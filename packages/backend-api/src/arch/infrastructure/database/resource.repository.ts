import { eq, and, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sysApplicationResources } from './drizzle-schema.js';
import { ROLE_HIERARCHY, type UserRole, type ApplicationContext } from '@openclinic/core';
import type { IResourceRepository } from '../../domain/repositories.js';
import type {
  ApplicationResourceEntity,
  ResourceTreeNodeEntity,
} from '../../domain/entities.js';
import type { MenuItemDTO } from '../../domain/dtos.js';


export class ResourceRepository implements IResourceRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listAll(limit = 1000): Promise<ApplicationResourceEntity[]> {
    const results = await this.db
      .select()
      .from(sysApplicationResources)
      .where(eq(sysApplicationResources.is_active, true))
      .orderBy(asc(sysApplicationResources.sort_order))
      .limit(limit);

    return results as ApplicationResourceEntity[];
  }

  async listByContext(context: ApplicationContext): Promise<ApplicationResourceEntity[]> {
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

    return results as ApplicationResourceEntity[];
  }

  async getById(id: string): Promise<ApplicationResourceEntity | null> {
    const [result] = await this.db
      .select()
      .from(sysApplicationResources)
      .where(eq(sysApplicationResources.id, id))
      .limit(1);

    return (result as ApplicationResourceEntity) ?? null;
  }

  async getByItemCode(itemCode: string): Promise<ApplicationResourceEntity | null> {
    const [result] = await this.db
      .select()
      .from(sysApplicationResources)
      .where(eq(sysApplicationResources.item_code, itemCode))
      .limit(1);

    return (result as ApplicationResourceEntity) ?? null;
  }

  async getTree(context?: ApplicationContext): Promise<ResourceTreeNodeEntity[]> {
    const resources = context
      ? await this.listByContext(context)
      : await this.listAll();

    const nodeMap = new Map<string, ResourceTreeNodeEntity>();
    const roots: ResourceTreeNodeEntity[] = [];

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

    const userLevel = ROLE_HIERARCHY[role] ?? 1;

    // Deduplicate by item_code preserving the first occurrence
    const seen = new Set<string>();
    const uniqueMenus: typeof allMenus = [];
    for (const m of allMenus) {
      if (!seen.has(m.item_code)) {
        seen.add(m.item_code);
        uniqueMenus.push(m);
      }
    }

    // Filter by RBAC role level
    const allowed = uniqueMenus.filter((m) => {
      const requiredLevel = ROLE_HIERARCHY[m.min_role as UserRole] ?? 1;
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
