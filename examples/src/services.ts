import { APIT } from "../../dist/apit-core";

export const serviceLogin = APIT.createService({
    id: 'LOGIN',
    endpoint: 'https://apit-framework.com/auth/sign-in',
    method: 'POST',
  });
  
export const serviceGetProfile = APIT.createService({
    id: 'GET_PROFILE',
    endpoint: 'https://apit-framework.com/auth/profile',
    method: 'GET',
  });

export const serviceListObjects = APIT.createService({
    id: 'GET_LIST_OBJECTS',
    endpoint: 'https://api.restful-api.dev/objects',
    method: 'GET',
  });

export const serviceGetObjectById = APIT.createService({
    id: 'GET_OBJECT_BY_ID',
    endpoint: 'https://api.restful-api.dev/objects?id=@@GET_LIST_OBJECTS.[0].id',
    method: 'GET',
  });