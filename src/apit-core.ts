/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as fs from "fs";

/**
 * Supported HTTP methods for defining API services.
 */
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  OPTIONS = "OPTIONS",
}

/**
 * Structure to define a new API service.
 *
 * @template TRequest Type of the request body.
 * @template TResponse Type of the response expected.
 * @template TParams Optional dynamic parameters to be injected into the URL.
 */
export interface APITServiceCreate<
  TRequest = unknown,
  TResponse = unknown,
  TParams = Record<string, string>
> {
  /** Unique identifier for the service */
  id: string;
  /** Endpoint URL. You can use dynamic placeholders like /resource/{id} */
  endpoint: string;
  /** HTTP method to use (GET, POST, etc.) */
  method: HttpMethod;
  /** Optional response shape definition */
  responseType?: () => TResponse;
  /** Optional params to interpolate in the endpoint URL */
  params?: TParams;
  /** Optional maximum number of redirects to follow */
  maxRedirects?: number;
  /** Custom function used to validate the status */
  validateStatus?: (status: number) => boolean;
}

/**
 * Structure to define an individual test for a service.
 *
 * @template TRequest Request type.
 * @template TResponse Expected response type.
 */
export interface APITTestCreate<TRequest = unknown, TResponse = unknown> {
  /** Unique identifier of the test */
  id: string;
  /** The service this test is for */
  service: APITService<TRequest, TResponse>;
  /** Optional body sent with the request */
  body?: TRequest;
  /** Optional request headers */
  headers?: Record<string, string>;
  /** Function to assert the expected response */
  expects: (data: TResponse) => void;
  /** Optional dynamic parameters injected in path or body */
  params?: Record<string, string | (() => string)>;
}

/**
 * Internal representation of a service definition.
 */
export interface APITService<
  TRequest = unknown,
  TResponse = unknown,
  TParams = Record<string, string>
> {
  id: string;
  endpoint: string;
  method: HttpMethod;
  responseType?: () => TResponse;
  params?: TParams;
  service: AxiosInstance;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
}

/**
 * Internal representation of a test instance.
 */
export interface APITTest<TRequest = unknown, TResponse = unknown> {
  id: string;
  service: APITService<TRequest, TResponse>;
  body?: TRequest;
  headers?: Record<string, string>;
  expects: (data: TResponse) => void;
  params?: Record<string, string | (() => string)>;
  response?: TResponse;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
}

/**
 * A flow represents a group of tests to be run in sequence.
 */
export interface APITFlow {
  /** Name of the flow */
  name: string;
  /** List of tests in execution order */
  services: APITTest<any, any>[];
}

/**
 * Internal structure to save test result values from previous requests.
 */
interface APITTestData {
  parentId: string;
  value: unknown;
}

/**
 * Internal structure to track test status for reporting.
 */
interface TestRunResult {
  status: "no-run" | "success" | "failed";
  service: string;
}

/**
 * Main class to execute API flows, run tests, and generate reports.
 */
export class APITCore {
  private filePath: string;
  private mermaidFilePath: string;

  /**
   * Create a new APITCore instance.
   * @param reportFilePath Path for the Markdown test report.
   * @param mermaidReportFilePath Path for the Mermaid diagram file.
   */
  constructor(
    reportFilePath: string = "test-report.md",
    mermaidReportFilePath: string = "mermaid-test-report.md"
  ) {
    this.filePath = reportFilePath;
    this.mermaidFilePath = mermaidReportFilePath;
  }

  private flows: APITFlow[] = [];
  private testSavedData: APITTestData[] = [];
  private testsRunExpectResult: TestRunResult[] = [];

  private readonly colorFailed = "#AD2A0A";
  private readonly colorSuccess = "#389B35";

  /**
   * Execute all added flows and their tests.
   * Interpolates dynamic values, runs HTTP requests, checks expectations, and stores the response.
   */
  public async run() {
    this.createFileReport();

    this.flows.forEach((flow) => {
      flow.services.forEach((service) => {
        this.testsRunExpectResult.push({
          status: "no-run",
          service: service.id,
        });
      });
    });

    const promises = this.flows.map((flow) => {
      console.log(`📦 Running Flow: ${flow.name}`);
      console.log("--------------------------------");
      return flow.services.reduce((promise, service) => {
        return promise.then(() => {
          const finalUrl = this.replaceEndpointPathParamsWithTestParams(
            service.service.endpoint,
            service.params
          );

          return service.service.service
            .request({
              method: service.service.method,
              url: finalUrl,
              data: this.replaceBodyParamsWithTestParams(
                service.body,
                service.params
              ),
              headers: this.replaceHeadersWithSavedData(service.headers),
              maxRedirects: service.service.maxRedirects,
              validateStatus: service.service.validateStatus
                ? service.service.validateStatus
                : (status) => status >= 200 && status < 400,
            })
            .then((response) => {
              service.expects(response.data);
              this.addExpectResultOrReplaceIfExist(service.id, "success");
              this.logData(service.service.id, response);
              this.saveTestData(response, service.id);
              service.response = response.data;
            })
            .catch((error) => {
              this.addExpectResultOrReplaceIfExist(service.id, "failed");
              this.logData(service.service.id, error, true);
            });
        });
      }, Promise.resolve());
    });
    await Promise.all(promises);
  }

  /**
   * Replace all {param} placeholders in the endpoint with their actual values.
   */
  private replaceEndpointPathParamsWithTestParams(
    endpoint: string,
    params?: Record<string, string | (() => string)>
  ): string {
    if (!params) return endpoint;
    let updated = endpoint;
    Object.entries(params).forEach(([key, value]) => {
      const resolved = typeof value === "function" ? value() : value;
      updated = updated.replace(`{${key}}`, resolved);
    });
    return updated;
  }

  /**
   * Replace placeholders inside the request body with resolved values.
   */
  private replaceBodyParamsWithTestParams<T>(
    body: T,
    params?: Record<string, string | (() => string)>
  ): T {
    if (!body || typeof body !== "object" || Array.isArray(body)) return body;
    const strBody = JSON.stringify(body);
    if (!params) return body;

    let updated = strBody;
    Object.entries(params).forEach(([key, value]) => {
      const resolved = typeof value === "function" ? value() : value;
      updated = updated.replace(new RegExp(`{${key}}`, "g"), resolved);
    });

    return JSON.parse(updated);
  }

  private addExpectResultOrReplaceIfExist(
    serviceId: string,
    status: TestRunResult["status"]
  ) {
    const index = this.testsRunExpectResult.findIndex(
      (expect) => expect.service === serviceId
    );
    if (index > -1) {
      this.testsRunExpectResult[index] = { status, service: serviceId };
    } else {
      this.testsRunExpectResult.push({ status, service: serviceId });
    }
  }

  /**
   * Generate a Mermaid diagram based on test execution results.
   */
  public async generateReportMermaid() {
    this.createMermaidReport();
    return this.createMermaidGraph();
  }

  /**
   * Add a new test flow to be executed.
   */
  public add(flow: APITFlow) {
    this.flows.push(flow);
  }

  private saveTestData(response: AxiosResponse, parentId: string) {
    this.testSavedData.push({ parentId, value: response.data });
  }

  private replaceHeadersWithSavedData(headers?: Record<string, string>) {
    if (!headers) return headers;

    let headersString = JSON.stringify(headers);
    const regex = /@@([a-zA-Z0-9_.]+)/g;
    const matches = headersString.match(regex);
    if (!matches) return headers;

    matches.forEach((match) => {
      const cleanMatch = match.split("@@")[1];
      const parentId = cleanMatch.split(".")[0];
      const value = cleanMatch.replace(`${parentId}.`, "");
      const data = this.testSavedData.find(
        (savedData) => savedData.parentId === parentId
      );
      if (data) {
        const valueToReplace = this.getValueByPath(data.value, value);
        headersString = headersString.replace(match, String(valueToReplace));
      }
    });

    return JSON.parse(headersString);
  }

  private getValueByPath(obj: unknown, path: string) {
    if (path.includes("[")) {
      const index = path.split("]")[0].replace("[", "");
      const parameter = path.split("]")[1].replace(".", "");
      return (obj as Record<string, unknown>[])[Number(index)][parameter];
    }

    return path
      .split(".")
      .reduce(
        (acc, part) => acc && (acc as Record<string, unknown>)[part],
        obj
      );
  }

  private sliceDataLength(data: unknown, forConsole = false) {
    if (!data) return false;

    let dataString = forConsole
      ? JSON.stringify(data)
      : JSON.stringify(data, null, 4);

    if (forConsole && dataString.length > 150) {
      dataString = dataString.slice(0, 150);
    }

    return forConsole ? dataString : `\n\"\"\"json\n${dataString}\n\"\"\"\n`;
  }

  private createFileReport() {
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    fs.writeFileSync(this.filePath, "");
    this.appendToReport(`# 📗 API Test Report\n\n`);
  }

  private createMermaidReport() {
    if (fs.existsSync(this.mermaidFilePath))
      fs.unlinkSync(this.mermaidFilePath);
    fs.writeFileSync(this.mermaidFilePath, "");
  }

  private appendToReport(content: string) {
    fs.appendFileSync(this.filePath, content);
  }

  private appendToReportMermaid(content: string) {
    fs.appendFileSync(this.mermaidFilePath, content);
  }

  private logData(
    endpointName: string,
    response: AxiosResponse | any,
    error: boolean = false
  ) {
    const request = {
      url: response.config?.url,
      method: response.config?.method,
      headers: response.config?.headers,
      body: this.isJSON(response.config?.data)
        ? JSON.parse(response.config?.data)
        : "",
    };
    this.appendToReport(
      `\n## ${
        error ? "❌" : "✅"
      }${endpointName} \n\n ### Request \n\n ${this.sliceDataLength(
        request
      )} \n\n ### Response \n >${error ? "NO-STATUS" : response.status} \n\n ${
        error
          ? `\"\"\"json\n${response.message}\n\"\"\"\n`
          : this.sliceDataLength(response.data)
      } \n`
    );

    console.log(
      `${error ? "❌" : "✅"} - ${endpointName} - ${
        response.config?.url
      } - Status: ${error ? "NO-STATUS" : response.status}`
    );
  }

  private isJSON(str?: string): boolean {
    if (!str) return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private async createMermaidGraph() {
    this.appendToReportMermaid("```mermaid\n graph LR\n");
    for (let i = 0; i < this.testsRunExpectResult.length - 1; i++) {
      this.appendToReportMermaid(
        `${this.testsRunExpectResult[i].service} --> ${
          this.testsRunExpectResult[i + 1].service
        }\n`
      );
    }
    this.testsRunExpectResult.forEach((result) => {
      const color =
        result.status === "failed" ? this.colorFailed : this.colorSuccess;
      this.appendToReportMermaid(`style ${result.service} fill:${color}\n`);
    });
    this.appendToReportMermaid("```");
  }
}

/**
 * Static factory to create API service definitions, test cases, and flows.
 */
export class APIT {
  /**
   * Creates and returns a new API service configuration. Used to define the API endpoint, HTTP method, and expected response.
   * This service can be used in multiple test cases. Its the first step in the test definition.
   *
   * @template TRequest Type of the request body.
   * @template TResponse Type of the response expected.
   * @template TParams Optional dynamic parameters to be injected into the URL or the Body.
   *
   * @param id Unique identifier for the service.
   * @param endpoint Endpoint URL. You can use dynamic placeholders like /resource/{id}
   * @param method HTTP method to use (GET, POST, etc.)
   * @param responseType Optional response shape definition.
   * @param params Optional params to interpolate in the endpoint URL
   * @param maxRedirects Optional maximum number of redirects to follow.
   * @param validateStatus Optional custom function used to validate the status.
   *
   * @returns APITService<TRequest, TResponse, TParams>
   */
  public static createService<
    TRequest = unknown,
    TResponse = unknown,
    TParams = Record<string, string>
  >({
    id,
    endpoint,
    method,
    responseType,
    params,
    maxRedirects = 0,
  }: APITServiceCreate<TRequest, TResponse, TParams>): APITService<
    TRequest,
    TResponse,
    TParams
  > {
    return {
      id,
      endpoint,
      method,
      responseType,
      params,
      service: axios.create({ baseURL: endpoint, method }),
      maxRedirects,
    };
  }

  /**
   * Creates and returns a test case for a given API service. This is the second step in the test definition.
   * It allows you to define the request body, headers, and expected response.
   * The test case can be executed independently or as part of a flow.
   *
   * @template TRequest Type of the request body.
   * @template TResponse Type of the response expected.
   *
   * @param id Unique identifier for the test.
   * @param service The service this test is for.
   * @param body Optional request body.
   * @param headers Optional request headers.
   * @param expects Function to assert the expected response.
   * @param params Optional dynamic parameters injected in path or body.
   *
   * @returns APITTest<TRequest, TResponse>
   */
  public static createTest<TRequest = unknown, TResponse = unknown>({
    id,
    service,
    body,
    headers,
    expects,
    params,
  }: APITTestCreate<TRequest, TResponse>): APITTest<TRequest, TResponse> {
    return { id, service, body, headers, expects, params };
  }

  /**
   * Creates a named sequence (flow) of test cases to execute. The flows are executed in the order they are defined.
   * This is useful for chaining multiple tests together.
   *
   * @param name Name of the flow.
   * @param services List of tests in execution order.
   *
   * @returns APITFlow
   */
  public static createFlow(
    name: string,
    services: APITTest<any, any>[]
  ): APITFlow {
    return {
      name,
      services,
    };
  }
}
