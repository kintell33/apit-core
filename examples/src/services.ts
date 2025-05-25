import { APIT, HttpMethod } from "../../src/apit-core";

const port = process.env.PORT || 4000;
const appUrl = `http://localhost:${port}`;

interface SignUpRequest {
  email: string;
  password: string;
  username: string;
}

interface SignUpResponse {
  id: string;
  username: string;
  tokenVerification: string;
}

interface GetMFARequest {
  email: string;
  password: string;
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

interface SignInRequest {
  email: string;
  password: string;
  mfaCode: string;
}

export const serviceSignUp = APIT.createService<SignUpRequest, SignUpResponse>({
  id: "SIGN_UP",
  endpoint: `${appUrl}/auth/sign-up`,
  method: HttpMethod.POST,
});

export const serviceVerifyEmail = APIT.createService<
  void,
  void,
  { tokenVerification: string }
>({
  id: "VERIFY_EMAIL",
  endpoint: `${appUrl}/auth/verify-user-email/{tokenVerification}`,
  method: HttpMethod.GET,
});

export const serviceGetMfa = APIT.createService<
  GetMFARequest,
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
  SignInRequest,
  SignInResponse,
  {
    mfaCode: string;
  }
>({
  id: "SIGN_IN",
  endpoint: `${appUrl}/auth/sign-in`,
  method: HttpMethod.POST,
});
