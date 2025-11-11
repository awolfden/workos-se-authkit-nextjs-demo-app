import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "../app/workos";
import { switchOrganization } from "../app/actions/switch-organization";
import { OrganizationSwitcher } from "@workos-inc/widgets";
import { headers } from "next/headers";

export default async function OrganizationSwitcherComponent() {
  const { user, organizationId, role } = await withAuth({
    ensureSignedIn: true,
  });

  console.log("[DEBUG] Organization Switcher:", {
    userId: user.id,
    organizationId,
    role,
  });

  if (!organizationId) {
    return <p>User does not belong to an organization</p>;
  }

  const widgetScopes: string[] = [
    "widgets:users-table:manage",
    "widgets:sso:manage",
    "widgets:api-keys:manage",
    "widgets:domain-verification:manage",
  ];

  const authToken = await (workos.widgets as any).getToken({
    userId: user.id,
    organizationId,
    scopes: widgetScopes,
  });

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  return (
    <OrganizationSwitcher
      authToken={authToken}
      switchToOrganization={async ({ organizationId: newOrgId }) => {
        console.log("[DEBUG] Organization Switch Attempt:", {
          fromOrgId: organizationId,
          toOrgId: newOrgId,
          currentRole: role,
        });

        try {
          await switchOrganization({ organizationId: newOrgId, pathname });
          console.log("[DEBUG] Organization Switch Success:", {
            toOrgId: newOrgId,
          });
        } catch (error) {
          console.error("[DEBUG] Organization Switch Error:", error);
          throw error;
        }
      }}
    />
  );
}
