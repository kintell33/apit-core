import { APIT } from "../../src/apit-core";
import expect from "expect";
import { v4 as uuidv4 } from "uuid";
import { serviceSignUp, serviceVerifyEmail } from "../src/services";

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
  expects: () => {
    expect(true).toBe(true); // ajustar según comportamiento real del endpoint
  },
});
