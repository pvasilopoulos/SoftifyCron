"use client";

import { useSyncExternalStore } from "react";
import { PeopleBoard } from "@/components/people-board";
import { RolesBoard, type TenantRoleView } from "@/components/roles-board";
import { AppearancePanel } from "@/components/appearance-panel";
import { SettingsForm } from "@/components/settings-form";
import { WorkspacePanels } from "@/components/workspace-panels";

const TABS = [
  { id: "people", label: "People" },
  { id: "roles", label: "Roles" },
  { id: "workspace", label: "Workspace" },
  { id: "appearance", label: "Appearance" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "people";
  const hash = window.location.hash.replace("#", "");
  return TABS.some((tab) => tab.id === hash) ? (hash as Tab) : "people";
}

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

export function WorkspaceSettings({
  tenant,
  members,
  invites,
  roles,
  groups,
  secrets,
  canManagePeople,
  canManageRoles,
  canEditSettings,
  canManageSecrets,
  canEditJobs,
  actorRole,
}: {
  tenant: { name: string; slug: string; timezone: string };
  members: Parameters<typeof PeopleBoard>[0]["members"];
  invites: Parameters<typeof PeopleBoard>[0]["invites"];
  roles: TenantRoleView[];
  groups: Parameters<typeof WorkspacePanels>[0]["groups"];
  secrets: Parameters<typeof WorkspacePanels>[0]["secrets"];
  canManagePeople: boolean;
  canManageRoles: boolean;
  canEditSettings: boolean;
  canManageSecrets: boolean;
  canEditJobs: boolean;
  actorRole: string;
}) {
  const tab = useSyncExternalStore(subscribeHash, tabFromHash, () => "people");

  function go(next: Tab) {
    const url = `${window.location.pathname}${window.location.search}#${next}`;
    window.history.pushState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Tenant</p>
          <h1 className="mt-2 font-display text-4xl">Workspace</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-dim">
            {tenant.name} · {members.length} {members.length === 1 ? "person" : "people"} ·{" "}
            {roles.length} roles
          </p>
        </div>
      </div>

      <nav className="ws-tabs" aria-label="Workspace sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "is-on" : ""}
            onClick={() => go(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "people" ? (
        <PeopleBoard
          members={members}
          invites={invites}
          roles={roles}
          canManagePeople={canManagePeople}
          actorRole={actorRole}
        />
      ) : null}

      {tab === "roles" ? <RolesBoard roles={roles} canManage={canManageRoles} /> : null}

      {tab === "workspace" ? (
        <div className="space-y-4">
          <section className="card p-6">
            <h2 className="font-display text-2xl">Details</h2>
            <p className="mt-1 text-sm text-ink-dim">
              Slug <span className="mono text-ink">{tenant.slug}</span>
            </p>
            <div className="mt-5 max-w-lg">
              <SettingsForm name={tenant.name} timezone={tenant.timezone} canEdit={canEditSettings} />
            </div>
          </section>
          <WorkspacePanels
            groups={groups}
            secrets={secrets}
            canManage={canEditJobs}
            canManageSecrets={canManageSecrets}
          />
        </div>
      ) : null}

      {tab === "appearance" ? <AppearancePanel /> : null}
    </div>
  );
}
