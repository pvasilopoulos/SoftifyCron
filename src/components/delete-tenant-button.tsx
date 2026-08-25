"use client";

import { deleteCustomerAction } from "@/app/actions/admin";

export function DeleteTenantButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <form
      action={deleteCustomerAction}
      onSubmit={(event) => {
        const ok = confirm(
          `Delete ${name}? This permanently removes its jobs, runs, people, roles, and secrets.`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="tenantId" value={id} />
      <button className="btn btn-danger" type="submit">
        Delete
      </button>
    </form>
  );
}
