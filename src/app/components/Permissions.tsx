import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, TextField, Flex, Box } from "@radix-ui/themes";

interface PermissionsProps {
  role: string;
}

export default async function Permissions({ role }: PermissionsProps) {
  const { user, permissions } = await withAuth({ ensureSignedIn: true });
  if (!user) {
    throw new Error("Authentication required");
  }

  const userFields = [
    ["Id", user.id],
    role ? ["Role", role] : [],
    permissions ? ["Permissions", permissions.map((p) => p.trim())] : [],
  ].filter((arr) => arr.length > 0);

  return (
    <>
      {userFields && (
        <Flex direction="column" justify="center" gap="3" width="400px">
          {userFields.map(([label, value]) => (
            <Flex asChild align="start" gap="6" key={String(label)}>
              <label>
                <Text weight="regular" size="3" style={{ width: 100 }}>
                  {label}
                </Text>

                <Box flexGrow="1">
                  {label === "Permissions" && Array.isArray(value) ? (
                    <Flex direction="column" gap="2">
                      {value.map((permission, index) => (
                        <TextField.Root
                          key={index}
                          value={permission}
                          readOnly
                        />
                      ))}
                    </Flex>
                  ) : (
                    <TextField.Root value={String(value) || ""} readOnly />
                  )}
                </Box>
              </label>
            </Flex>
          ))}
        </Flex>
      )}
    </>
  );
}
