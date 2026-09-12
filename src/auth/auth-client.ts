"use client";

import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admin, manager, user } from "./permissions";

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: { user, manager, admin } })],
});

export const { useSession, signIn, signUp, signOut } = authClient;
