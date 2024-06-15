import { APIT } from "./framework";

export const serviceLogin = APIT.createService({
    id: 'LOGIN',
    endpoint: 'https://api-dev.bevytec.com/auth/sign-in',
    method: 'POST',
  });
  
export const serviceGetProfile = APIT.createService({
    id: 'GET_PROFILE',
    endpoint: 'https://api-dev.bevytec.com/auth/profile',
    method: 'GET',
  });