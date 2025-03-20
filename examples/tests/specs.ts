import { APIT } from "apit-core";
import expect from "expect";
import {
  serviceGetObjectById,
  serviceGetProfile,
  serviceListObjects,
  serviceLogin,
} from "../src/services";

export const loginTestService = APIT.createTest({
  id: "LOGIN_TEST",
  service: serviceLogin,
  body: { email: "email@test.com", password: "password" },
  expects: (result: any) => {
    expect(result).toHaveProperty("credentials.accessToken");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("roles");
  },
  headers: {
    "api-key": "api-key-value",
  },
});

export const getProfileTestService = APIT.createTest({
  id: "PROFILE_TEST",
  service: serviceGetProfile,
  body: {},
  expects: (result: any) => {
    expect(result).toBeDefined();
  },
  headers: {
    "api-key": "api-key-value",
    Authorization: "Bearer @@LOGIN_TEST.credentials.idToken",
  },
});

export const getListOfObjects = APIT.createTest({
  id: "GET_LIST_OBJECTS",
  service: serviceListObjects,
  body: {},
  expects: (result: any) => {
    expect(result).toBeDefined();
  },
});

export const getObjectById = APIT.createTest({
  id: "GET_OBJECT_BY_ID",
  service: serviceGetObjectById,
  body: {},
  expects: (result: any) => {
    expect(result).toBeDefined();
  },
});
