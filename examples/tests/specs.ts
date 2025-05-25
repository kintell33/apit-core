import { APIT } from "../../src/apit-core";
import expect from "expect";
import { v4 as uuidv4 } from "uuid";
import {
  serviceGetMfa,
  serviceSignIn,
  serviceSignUp,
  serviceVerifyEmail,
} from "../src/services";

const getUUID = () => uuidv4().replace(/-/g, "");

const email = `test${getUUID()}@test.com`;
const password = "Panqueque$49";
const username = `test-${getUUID()}`;

export const signUpTestService = APIT.createTest({
  id: "SIGN_UP",
  service: serviceSignUp,
  body: { email, password, username },
  expects: (result) => {
    expect(result).toHaveProperty("tokenVerification");
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("username");
  },
});

export const verifyEmailTestService = APIT.createTest({
  id: "VERIFY_EMAIL",
  service: serviceVerifyEmail,
  params: {
    tokenVerification: () =>
      signUpTestService.response?.tokenVerification || "",
  },
  expects: () => {},
});

export const getMfaCodeTestService = APIT.createTest({
  id: "GET_MFA",
  service: serviceGetMfa,
  body: {
    email,
    password,
  },
  expects: (result) => {
    expect(result).toHaveProperty("tokenMfa");
    expect(result).toHaveProperty("message");
  },
});

export const signInTestService = APIT.createTest({
  id: "SIGN_IN",
  service: serviceSignIn,
  body: {
    email,
    password,
    mfaCode: getMfaCodeTestService.response?.tokenMfa || "",
  },
  params: {
    mfaCode: () => getMfaCodeTestService.response?.tokenMfa || "",
  },
  expects: (result) => {
    expect(result).toHaveProperty("credentials");
    expect(result.credentials).toHaveProperty("token");
  },
});
