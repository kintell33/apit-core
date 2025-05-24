import { APIT } from "../../src/apit-core";

const port = process.env.PORT || 4000;
const appUrl = `http://localhost:${port}`;

interface SignUpResponse {
  id: string;
  username: string;
  tokenVerification: string;
}

export const serviceSignUp = APIT.createService<SignUpResponse>({
  id: "SIGN_UP",
  endpoint: `${appUrl}/auth/sign-up`,
  method: "POST",
});

export const serviceVerifyEmail = APIT.createService<
  void,
  { tokenVerification: string }
>({
  id: "VERIFY_EMAIL",
  endpoint: `${appUrl}/auth/verify-user-email/{tokenVerification}`,
  method: "GET",
});
