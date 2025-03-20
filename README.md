# APIT *(API Testing Library for Typescript)*

**APIT** is a lightweight and flexible API testing library built with TypeScript, allowing you to define and execute **API tests** in a structured manner.  

With **APIT**, you can:  

- Create **services** that represent API endpoints  
- Define **test cases** with expected responses  
- Organize tests into **flows**  
- Execute tests and generate **detailed reports**  

---

## 🚀 **Installation**  

Once published on npm, you will be able to install it with:  

```sh
npm install apit-core
```

To generate a starter project structure and run tests, install **`apitcli`** globally:  

```sh
npm install -g apit-core
```

---

## 📌 **Quick Start**  

To quickly set up a project with example files, run:  

```sh
apitcli start
```

This will generate the following structure:  

```
/apit-test
 ├── src/
 │   ├── services.ts
 │
 ├── tests/
 │   ├── flows.ts
 │   ├── specs.ts
```

To run the tests, simply execute:

```sh
apitcli run
```

---

## 📌 **Generated File Overview**  

### **1️⃣ Define API Services (`src/services.ts`)**  

Each **service** represents an API endpoint with a unique identifier, an endpoint URL, and an HTTP method.  

```ts
import { APIT } from "../../dist/apit-core";

export const serviceLogin = APIT.createService({
  id: "LOGIN",
  endpoint: "https://apit-framework.com/auth/sign-in",
  method: "POST",
});

export const serviceGetProfile = APIT.createService({
  id: "GET_PROFILE",
  endpoint: "https://apit-framework.com/auth/profile",
  method: "GET",
});

export const serviceListObjects = APIT.createService({
  id: "GET_LIST_OBJECTS",
  endpoint: "https://api.example.com/objects",
  method: "GET",
});

export const serviceGetObjectById = APIT.createService({
  id: "GET_OBJECT_BY_ID",
  endpoint: "https://api.example.com/objects?id=@@GET_LIST_OBJECTS.[0].id",
  method: "GET",
});
```

---

### **2️⃣ Define API Tests (`tests/specs.ts`)**  

Each **test case** executes a request and verifies the response using expectations.  

```ts
import { APIT } from "../../dist/apit-core";
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
```

---

### **3️⃣ Create and Run a Test Flow (`tests/flows.ts`)**  

Flows allow you to group multiple test cases in a specific execution order.  

```ts
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
```

---

## 📜 **Test Execution Reports**  

After running tests, two files are generated:  

- **Execution Report:** Contains request and response details.  
- **Mermaid Flowchart Report:** Displays the test execution flow.  

### **Example Mermaid Report**  

The following Mermaid flowchart shows the execution order of test cases:  

```mermaid
graph LR
LOGIN_TEST --> PROFILE_TEST
PROFILE_TEST --> GET_LIST_OBJECTS
GET_LIST_OBJECTS --> GET_OBJECT_BY_ID
style LOGIN_TEST fill:#389B35
style PROFILE_TEST fill:#389B35
style GET_LIST_OBJECTS fill:#AD2A0A
style GET_OBJECT_BY_ID fill:#AD2A0A
```

---

## ✅ **Why Use APIT?**  

- **TypeScript Support** – Get full type safety and autocompletion.  
- **Customizable Test Flows** – Define execution sequences for complex API scenarios.  
- **Automated Test Reports** – Generate Markdown logs and Mermaid diagrams.  
- **Lightweight & Flexible** – No unnecessary dependencies, easy to integrate.  

---

## 🎯 **Using the CLI (`apitcli`)**  

Once installed, you can run:  

```sh
apitcli start  # Generates the initial project structure
apitcli run    # Executes the tests automatically
```

Users can also add a script to their `package.json` inside `apit-test/` to make running tests even easier:

```json
{
  "scripts": {
    "test:api": "apitcli run"
  }
}
```
Then, tests can be executed with:
```sh
npm test:api
```

---

## 🛠 **License**  

This project is licensed under the **MIT License**.  
