import { APIT } from './framework';
import expect from 'expect';
import { serviceGetProfile, serviceLogin } from './test-services';

export const loginTestService = APIT.createTest({
  id: 'LOGIN_TEST',
  service: serviceLogin,
  body: { email: 'system@truenorth.co', password: 'Panqueque$491qaz2wsx' },
  expects: (result:any) => {
    expect(result).toHaveProperty('credentials.accessToken');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('roles');
  },
  headers: {
    'application-key': 'portal-web-app',
  },
});

export const getProfileTestService = APIT.createTest({
  id: 'PROFILE_TEST',
  service: serviceGetProfile,
  body: {},
  expects: (result:any) => {
    expect(result).toBeDefined();
  },
  headers: {
    'application-key': 'portal-web-app',
    Authorization: 'Bearer @@LOGIN_TEST.credentials.idToken', //variables
  },
});
