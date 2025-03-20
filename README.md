# **APIT - API Testing Framework for Node.js (TypeScript)**

**APIT** is a lightweight and flexible API testing framework built with TypeScript, allowing you to define and execute **API tests** in a structured manner.

With **APIT**, you can:

- Create **services** that represent API endpoints
- Define **test cases** with expected responses
- Organize tests into **flows**
- Execute tests and generate **detailed reports**

## 🚀 **Installation**

Once published on npm, you will be able to install it with:

```sh
npm install apit-framework
```

## 📌 **Usage**

### **1️⃣ Define API Services**

Each **service** represents an API endpoint with a unique identifier, an endpoint URL, and an HTTP method.

```ts
import { APIT } from "apit-framework";

export const getUsersService = APIT.createService({
  id: "GET_USERS",
  endpoint: "https://api.example.com/users",
  method: "GET",
});

export const getUserByIdService = APIT.createService({
  id: "GET_USER_BY_ID",
  endpoint: "https://api.example.com/users?id=@@GET_USERS.[0].id",
  method: "GET",
});
```

---

### **2️⃣ Define API Tests**

Each **test case** executes a request and verifies the response using expectations.

```ts
import { APIT } from "apit-framework";
import expect from "expect";
import { getUsersService, getUserByIdService } from "./test-services";

export const getUsersTest = APIT.createTest({
  id: "GET_USERS_TEST",
  service: getUsersService,
  body: {},
  expects: (result: any) => {
    expect(Array.isArray(result)).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  },
});

export const getUserByIdTest = APIT.createTest({
  id: "GET_USER_BY_ID_TEST",
  service: getUserByIdService,
  body: {},
  expects: (result: any) => {
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
  },
});
```

---

### **3️⃣ Create and Run a Test Flow**

Flows allow you to group multiple test cases in a specific execution order.

```ts
import { APIT, APITFramework } from "apit-framework";
import { getUsersTest, getUserByIdTest } from "./test-cases";

class TestRunner {
  async start() {
    // Define the report file name
    const apitFramework = new APITFramework("api-test-report.md");

    // Create a test flow
    const userFlow = APIT.createFlow("USER_API_FLOW", [
      getUsersTest,
      getUserByIdTest,
    ]);

    // Add the flow to the framework
    apitFramework.add(userFlow);

    // Execute the tests
    await apitFramework.run();

    // Generate a test execution report
    await apitFramework.generateReportMermaid();
  }
}

// Run the tests
const testRunner = new TestRunner();
testRunner.start();
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
GET_USERS_TEST --> GET_USER_BY_ID_TEST
style GET_USERS_TEST fill:#389B35
style GET_USER_BY_ID_TEST fill:#AD2A0A
```

---

### **Example Execution Report (`api-test-report.md`)**

This file includes detailed request and response information.

#### **GET_USERS_TEST**

### **Request**

```json
{
  "url": "https://api.example.com/users",
  "method": "GET",
  "headers": {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "axios/1.7.2"
  },
  "body": {}
}
```

### **Response**

> 200 OK

```json
[
  {
    "id": "1",
    "name": "John Doe"
  },
  {
    "id": "2",
    "name": "Jane Smith"
  }
]
```

#### **GET_USER_BY_ID_TEST**

### **Request**

```json
{
  "url": "https://api.example.com/users?id=1",
  "method": "GET",
  "headers": {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "axios/1.7.2"
  },
  "body": {}
}
```

### **Response**

> 200 OK

```json
{
  "id": "1",
  "name": "John Doe"
}
```

---

## ✅ **Why Use APIT?**

- **TypeScript Support** – Get full type safety and autocompletion.
- **Customizable Test Flows** – Define execution sequences for complex API scenarios.
- **Automated Test Reports** – Generate Markdown logs and Mermaid diagrams.
- **Lightweight & Flexible** – No unnecessary dependencies, easy to integrate.

---

## 🛠 **License**

This project is licensed under the **MIT License**.
