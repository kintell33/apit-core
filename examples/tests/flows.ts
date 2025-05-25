import { APIT, APITCore } from "../../src/apit-core";
import {
  getMfaCodeTestService,
  signInTestService,
  signUpTestService,
  verifyEmailTestService,
} from "./specs";

class TestExecutionFlows {
  async start() {
    const apitFramework = new APITCore();

    const fullFlow = APIT.createFlow("FULL_FLOW", [
      signUpTestService,
      verifyEmailTestService,
      getMfaCodeTestService,
      signInTestService,
    ]);

    apitFramework.add(fullFlow);

    await apitFramework.run();
    await apitFramework.generateReportMermaid();
  }
}

new TestExecutionFlows().start();
