import { APIT, APITFramework } from "../../dist/apit-core";
import {
  getListOfObjects,
  getObjectById,
  getProfileTestService,
  loginTestService,
} from "./specs";

class TestExecutionFlows {
  async start() {
    const apitFramework = new APITFramework();

    const simpleFlow = APIT.createFlow("SIMPLE_FLOW", [
      loginTestService,
      getProfileTestService,
      getListOfObjects,
      getObjectById,
    ]);

    apitFramework.add(simpleFlow);

    await apitFramework.run();
    await apitFramework.generateReportMermaid();
  }
}

const testExecution = new TestExecutionFlows();
testExecution.start();
