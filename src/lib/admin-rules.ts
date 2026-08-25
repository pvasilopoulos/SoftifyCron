export function assertOwnerProvision(input: {
  mode: "create" | "attach";
  existing: { platformRole: string } | null;
}) {
  if (input.existing?.platformRole === "SUPERADMIN") {
    throw new Error("Platform admins cannot own a customer workspace");
  }
  if (input.mode === "attach" && !input.existing) {
    throw new Error("No account with that email. Create a new login instead.");
  }
  if (input.mode === "create" && input.existing) {
    throw new Error("An account with that email already exists. Attach it instead.");
  }
}

export function assertCanDeletePlatformUser(input: {
  platformRole: string;
  memberships: { role: string; tenantName: string; ownerCount: number }[];
}) {
  if (input.platformRole === "SUPERADMIN") {
    throw new Error("Platform admins cannot be deleted from the customer list");
  }
  const blocked = input.memberships.find(
    (row) => row.role === "OWNER" && row.ownerCount <= 1,
  );
  if (blocked) {
    throw new Error(
      `Transfer ownership of ${blocked.tenantName} before deleting this user`,
    );
  }
}
