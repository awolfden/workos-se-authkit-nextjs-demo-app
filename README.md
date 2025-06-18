# Next.js integration example using AuthKit

An example application demonstrating how to authenticate users with AuthKit and the WorkOS Node SDK.

> Refer to the [User Management](https://workos.com/docs/user-management) documentation for reference.

## Prerequisites

You will need a [WorkOS account](https://dashboard.workos.com/signup).

## Running the example

1. In the [WorkOS dashboard](https://dashboard.workos.com), head to the Redirects tab and create a [sign-in callback redirect](https://workos.com/docs/user-management/1-configure-your-project/configure-a-redirect-uri) for `http://localhost:3000/callback` and set the app homepage URL to `http://localhost:3000`.

2. After creating the redirect URI, navigate to the API keys tab and copy the _Client ID_ and the _Secret Key_. Create a `.env.local` file in the root directory and supply your Client ID and API key as environment variables.

3. Additionally, create a cookie password as the private key used to encrypt the session cookie. Copy the output into the environment variable `WORKOS_COOKIE_PASSWORD`.

   It has to be at least 32 characters long. You can use https://1password.com/password-generator/ to generate strong passwords.

4. Verify your `.env.local` file has the following variables filled:

   ```bash
   WORKOS_CLIENT_ID=<YOUR_CLIENT_ID>
   WORKOS_API_KEY=<YOUR_API_SECRET_KEY>
   WORKOS_COOKIE_PASSWORD=<YOUR_COOKIE_PASSWORD>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ACTIONS_SECRET=<YOUR_ACTIONS_SECRET>
   ACCENT_COLOR=<RADIX_THEME_COLOR_ENUM_VALUE> # can be found here -> https://www.radix-ui.com/themes/docs/theme/color
   PROSPECT_LOGO=<URL_WITH_LOGO_IMAGE>
   ```

   **Note**: The `ACTIONS_SECRET` is required for server actions and should be a secure random string.

5. Run the following command and navigate to [http://localhost:3000](http://localhost:3000).

   ```bash
   npm install
   npm run dev
   ```

## Features

This example demonstrates:

- **Authentication**: Sign in/out with AuthKit
- **Organization Management**: Switch between organizations
- **User Settings**: Profile, security, sessions, permissions, and team management
- **Enterprise Integrations**: SSO and SCIM configuration via WorkOS Portal
- **Directory Sync**: Automatic team management when SCIM is active
- **Role-based Access**: Different permissions based on user roles

## Environment Variables

| Variable                 | Description                                           | Required              |
| ------------------------ | ----------------------------------------------------- | --------------------- |
| `WORKOS_CLIENT_ID`       | Your WorkOS Client ID                                 | Yes                   |
| `WORKOS_API_KEY`         | Your WorkOS API Secret Key                            | Yes                   |
| `WORKOS_COOKIE_PASSWORD` | Password for session cookie encryption (min 32 chars) | Yes                   |
| `NEXT_PUBLIC_APP_URL`    | Your application URL                                  | Yes                   |
| `ACTIONS_SECRET`         | Secret for server actions                             | Yes                   |
| `ACCENT_COLOR`           | Radix UI theme accent color                           | No (defaults to gold) |
| `PROSPECT_LOGO`          | URL for the logo image in navigation                  | No                    |
