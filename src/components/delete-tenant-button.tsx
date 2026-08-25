"use client";

import { useState } from "react";
import { deleteCustomerAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function DeleteTenantButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-danger" type="button" onClick={() => setOpen(true)}>
        Delete
      </button>
      {open ? (
        <ConfirmDialog
          title={`Delete ${name}?`}
          body="This permanently removes its jobs, runs, people, roles, and secrets."
          onCancel={() => setOpen(false)}
        >
          <form action={deleteCustomerAction}>
            <input type="hidden" name="tenantId" value={id} />
            <button className="btn btn-danger" type="submit">
              Delete tenant
            </button>
          </form>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
