import { APIT, APITFramework } from "./framework";
import { getProfileTestService, loginTestService } from "./test";

class TestExecution {
    async start() {
        const apitFramework = new APITFramework('test-report.md');

        const simpleFlow = APIT.createFlow('SIMPLE_FLOW', [
        loginTestService,
        getProfileTestService,
        ]);

        apitFramework.add(simpleFlow);

        await apitFramework.run();
        await apitFramework.generateReportMermaid();
    }
}

const testExecution = new TestExecution();
testExecution.start();