"use client";

import { PeopleBoard } from "@/components/people-board";
import { RolesBoard, type TenantRoleView } from "@/components/roles-board";

type Member = Parameters<typeof PeopleBoard>[0]["members"][number];
type Invite = Parameters<typeof PeopleBoard>[0]["invites"][number];

export function AdminTenantBoards({
  tenantId,
  members,
  invites,
  roles,
}: {
  tenantId: string;
  members: Member[];
  invites: Invite[];
  roles: TenantRoleView[];
}) {
  return (
    <>
      <RolesBoard
        roles={roles}
        canManage
        endpoints={{
          list: `/api/admin/tenants/${tenantId}/roles`,
          item: (roleId) => `/api/admin/tenants/${tenantId}/roles/${roleId}`,
        }}
      />
      <PeopleBoard
        members={members}
        invites={invites}
        roles={roles}
        canManagePeople
        actorRole="OWNER"
        allowOwnerRole
        endpoints={{
          members: `/api/admin/tenants/${tenantId}/members`,
          member: (membershipId) => `/api/admin/tenants/${tenantId}/members/${membershipId}`,
          invites: `/api/admin/tenants/${tenantId}/invites`,
          invite: (inviteId) => `/api/admin/tenants/${tenantId}/invites?id=${inviteId}`,
        }}
      />
    </>
  );
}
