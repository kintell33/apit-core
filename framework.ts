/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';

export interface APITServiceCreate {
  id: string;
  endpoint: string;
  method: string;
}

export interface APITTestCreate {
  id: string;
  service: APITService;
  body: unknown;
  headers?: Record<string, string>;
  expects: (data: unknown) => void;
}

export interface APITTest {
  id: string;
  service: APITService;
  body: unknown;
  headers?: Record<string, string>;
  expects: (data: unknown) => void;
}

export interface APITService {
  id: string;
  service: AxiosInstance;
}

export interface APITFlowCreate {
  name: string;
  services: APITTest[];
}

export interface APITFlow {
  name: string;
  services: APITTest[];
}

interface APITTestData {
  parentId: string;
  value: unknown;
}

interface TestRunResult {
  status: 'no-run' | 'success' | 'failed';
  service: string;
}

export class APITFramework {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private flows: APITFlow[] = [];
  private testSavedData: APITTestData[] = [];
  private testsRunExpectResult: TestRunResult[] = [];

  private readonly colorFailed = '#AD2A0A';
  private readonly colorSuccess = '#389B35';

  public async run() {
    this.createFileReport();

    this.flows.forEach((flow) => {
      flow.services.forEach((service) => {
        this.testsRunExpectResult.push({
          status: 'no-run',
          service: service.id,
        });
      });
    });

    const promises = this.flows.map((flow) => {
      console.log(`RUNNING FLOW ${flow.name}`);
      console.log('--------------------------------');
      return flow.services.reduce((promise, service) => {
        return promise.then(() => {
          return service.service.service
            .request({
              method: service.service.service.defaults.method,
              url: this.replaceEndpointUrlParamsWithSavedData(service.service.service.defaults.baseURL),
              data: service.body,
              headers: this.replaceHeadersWithSavedData(service.headers),
            })
            .then((response) => {
              service.expects(response.data);
              this.addExpectResultOrReplaceIfExist(service.id, 'success');
              this.logData(service.service.id, response);
              this.saveTestData(response, service.id);
            })
            .catch((error) => {
              this.addExpectResultOrReplaceIfExist(service.id, 'failed');
              console.log(`Error on service ${service.service.id}`);
              console.error(error);
            });
        });
      }, Promise.resolve());
    });
    await Promise.all(promises);
  }

  private addExpectResultOrReplaceIfExist(serviceId: string, status: TestRunResult['status']) {
    const index = this.testsRunExpectResult.findIndex(
      (expect) => expect.service === serviceId,
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

  private replaceEndpointUrlParamsWithSavedData(baseUrl: string | undefined) {
    if(!baseUrl) return baseUrl;
    let url = baseUrl;
    const paramsString = url.split('?')[1];
    if (!paramsString) return url;
    const params = paramsString.split('&');
    params.forEach((param) => {
      const [key, value] = param.split('=');
      const cleanObject = value.replace('@@', '');
      const parentId = cleanObject.split('.')[0];
      const path = cleanObject.replace(`${parentId}.`, '');
      const data = this.testSavedData.find(
        (savedData) => savedData.parentId === parentId,
      );

      if (data) {
        

        const valueToReplace = this.getValueByPath(data.value, path);
        url = url.replace(param, param.split('=')[0] + '=' + String(valueToReplace));
      }
    });
    return url;
  }

  private replaceHeadersWithSavedData(headers?: Record<string, string>) {
    if (!headers) return headers;

    let headersString = JSON.stringify(headers);
    const regex = /@@([a-zA-Z0-9_.]+)/g;
    const matches = headersString.match(regex);
    if (!matches) return headers;

    matches.forEach((match) => {
      const cleanMatch = match.split('@@')[1];
      const parentId = cleanMatch.split('.')[0];
      const value = cleanMatch.replace(`${parentId}.`, '');
      const data = this.testSavedData.find(
        (savedData) => savedData.parentId === parentId,
      );
      if (data) {
        const valueToReplace = this.getValueByPath(data.value, value);
        headersString = headersString.replace(match, String(valueToReplace));
      }
    });

    return JSON.parse(headersString);
  }

  private getValueByPath(obj: unknown, path: string) {
    //check if path is for look into an array
    if (path.includes('[')) {
      const index = path.split(']')[0].replace('[', '');
      const parameter = path.split(']')[1].replace('.', '');
      return (obj as Record<string, unknown>[])[Number(index)][parameter];
    }

    return path.split('.').reduce((acc, part) => acc && (acc as Record<string, unknown>)[part], obj);
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
    fs.writeFileSync(this.filePath, '');
  }

  private createMermaidReport() {
    if (fs.existsSync(`mermaid-${this.filePath}`)) {
      fs.unlinkSync(`mermaid-${this.filePath}`);
    }
    fs.writeFileSync(`mermaid-${this.filePath}`, '');
  }

  private appendToReport(content: string) {
    fs.appendFileSync(this.filePath, content);
  }

  private appendToReportMermaid(content: string) {
    fs.appendFileSync(`mermaid-${this.filePath}`, content);
  }

  private logData(endpointName: string, response: AxiosResponse) {
    const request = {
      url: response.config.url,
      method: response.config.method,
      headers: response.config.headers,
      body: this.isJSON(response.config.data)
        ? JSON.parse(response.config.data)
        : '',
    };
    this.appendToReport(
      `\n## ${endpointName} \n\n ### Request \n\n ${this.sliceDataLength(request)} \n\n ### Response \n >${response.status} \n\n ${this.sliceDataLength(response.data)} \n`,
    );

    console.log(
      `${endpointName} - ${response.config.url} - status:${response.status}\n${this.sliceDataLength(response.data, true)}\n`,
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
    this.appendToReportMermaid('```mermaid\n graph LR\n');
    for (let i = 0; i < this.testsRunExpectResult.length - 1; i++) {
      this.appendToReportMermaid(
        `${this.testsRunExpectResult[i].service} --> ${this.testsRunExpectResult[i + 1].service}\n`,
      );
    }

    this.testsRunExpectResult.forEach((result) => {
      const color = result.status === 'failed' ? this.colorFailed : this.colorSuccess;
      this.appendToReportMermaid(`style ${result.service} fill:${color}\n`);
    });

    this.appendToReportMermaid('```');
  }
}

export class APIT {
  public static createService({
    id,
    endpoint,
    method,
  }: APITServiceCreate): APITService {
    return {
      id,
      service: axios.create({
        baseURL: endpoint,
        method,
      }),
    };
  }

  public static createTest({
    id,
    service,
    body,
    headers,
    expects,
  }: APITTestCreate): APITTest {
    return {
      id,
      service,
      body,
      headers,
      expects,
    };
  }

  public static createFlow(name: string, services: APITTest[]): APITFlow {
    return {
      name,
      services,
    };
  }
}
