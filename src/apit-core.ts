/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as fs from "fs";

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  OPTIONS = "OPTIONS",
}

export interface APITServiceCreate<
  TResponse = unknown,
  TParams = Record<string, string>
> {
  id: string;
  endpoint: string;
  method: HttpMethod;
  responseType?: () => TResponse;
  params?: TParams;
}

export interface APITTestCreate<TResponse = unknown> {
  id: string;
  service: APITService<TResponse>;
  body?: unknown;
  headers?: Record<string, string>;
  expects: (data: TResponse) => void;
  params?: Record<string, string | (() => string)>;
}

export interface APITService<
  TResponse = unknown,
  TParams = Record<string, string>
> {
  id: string;
  endpoint: string;
  method: HttpMethod;
  responseType?: () => TResponse;
  params?: TParams;
  service: AxiosInstance;
}

export interface APITTest<TResponse = unknown> {
  id: string;
  service: APITService<TResponse>;
  body?: unknown;
  headers?: Record<string, string>;
  expects: (data: TResponse) => void;
  params?: Record<string, string | (() => string)>;
  response?: TResponse;
}

export interface APITFlow {
  name: string;
  services: APITTest<any>[];
}

interface APITTestData {
  parentId: string;
  value: unknown;
}

interface TestRunResult {
  status: "no-run" | "success" | "failed";
  service: string;
}

export class APITCore {
  private filePath: string;
  private mermaidFilePath: string;

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
              data: service.body,
              headers: this.replaceHeadersWithSavedData(service.headers),
              maxRedirects: 0,
              validateStatus: (status) => {
                return status >= 200 && status < 500;
              },
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

  private addExpectResultOrReplaceIfExist(
    serviceId: string,
    status: TestRunResult["status"]
  ) {
    const index = this.testsRunExpectResult.findIndex(
      (expect) => expect.service === serviceId
    );
    if (index > -1) {
      this.testsRunExpectResult[index] = {
        status,
        service: serviceId,
      };
    } else {
      this.testsRunExpectResult.push({
        status,
        service: serviceId,
      });
    }
  }

  public async generateReportMermaid() {
    this.createMermaidReport();
    return this.createMermaidGraph();
  }

  public add(flow: APITFlow) {
    this.flows.push(flow);
  }

  private saveTestData(response: AxiosResponse, parentId: string) {
    this.testSavedData.push({
      parentId,
      value: response.data,
    });
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

    return forConsole ? dataString : `\n\`\`\`json\n${dataString}\n\`\`\`\n`;
  }

  private createFileReport() {
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
    fs.writeFileSync(this.filePath, "");

    this.appendToReport(`# 📗 API Test Report\n\n`);
  }

  private createMermaidReport() {
    if (fs.existsSync(`${this.mermaidFilePath}`)) {
      fs.unlinkSync(`${this.mermaidFilePath}`);
    }
    fs.writeFileSync(`${this.mermaidFilePath}`, "");
  }

  private appendToReport(content: string) {
    fs.appendFileSync(this.filePath, content);
  }

  private appendToReportMermaid(content: string) {
    fs.appendFileSync(`${this.mermaidFilePath}`, content);
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
          ? `\`\`\`json\n${response.message}\n\`\`\`\n`
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

export class APIT {
  public static createService<
    TResponse = unknown,
    TParams = Record<string, string>
  >({
    id,
    endpoint,
    method,
    responseType,
    params,
  }: APITServiceCreate<TResponse, TParams>): APITService<TResponse, TParams> {
    return {
      id,
      endpoint,
      method,
      responseType,
      params,
      service: axios.create({
        baseURL: endpoint,
        method,
      }),
    };
  }

  public static createTest<TResponse = unknown>({
    id,
    service,
    body,
    headers,
    expects,
    params,
  }: APITTestCreate<TResponse>): APITTest<TResponse> {
    return {
      id,
      service,
      body,
      headers,
      expects,
      params,
    };
  }

  public static createFlow(name: string, services: APITTest<any>[]): APITFlow {
    return {
      name,
      services,
    };
  }
}
