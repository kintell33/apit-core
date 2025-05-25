import { APIT, HttpMethod } from "../../src/apit-core";

const port = process.env.PORT || 4000;
const appUrl = `http://localhost:${port}`;

interface SignUpResponse {
  id: string;
  username: string;
  tokenVerification: string;
}

interface GetMFAResponse {
  message: string;
  tokenMfa: string;
}

interface SignInCredentialsResponse {
  token: string;
}

interface SignInResponse {
  credentials: SignInCredentialsResponse;
}

export const serviceSignUp = APIT.createService<SignUpResponse>({
  id: "SIGN_UP",
  endpoint: `${appUrl}/auth/sign-up`,
  method: HttpMethod.POST,
});

export const serviceVerifyEmail = APIT.createService<
  void,
  { tokenVerification: string }
>({
  id: "VERIFY_EMAIL",
  endpoint: `${appUrl}/auth/verify-user-email/{tokenVerification}`,
  method: HttpMethod.GET,
});

export const serviceGetMfa = APIT.createService<
  GetMFAResponse,
  {
    email: string;
    password: string;
  }
>({
  id: "GET_MFA",
  endpoint: `${appUrl}/auth/get-mfa-code`,
  method: HttpMethod.POST,
});

export const serviceSignIn = APIT.createService<
  SignInResponse,
  {
    email: string;
    password: string;
    mfaCode: string;
  }
>({
  id: "SIGN_IN",
  endpoint: `${appUrl}/auth/sign-in`,
  method: HttpMethod.POST,
});
