/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as fs from 'fs';

export interface APITServiceCreate {
  id: string;
  endpoint: string;
  method: string;
}

export interface APITTestCreate {
  id: string;
  service: APITService;
  body: any;
  headers?: any;
  expects: any;
}

export interface APITTest {
  id: string;
  service: APITService;
  body: any;
  headers?: any;
  expects: any;
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
  value: any;
}

export class APITFramework {
  private filePath = 'test-report.md';

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private flows:any = [];
  private testSavedData: APITTestData[] = [];
  private testsRunExpectResult: any = [];

  private colorFailed = '#CA7661';
  private colorSuccess = '#81CA61';

  public async run() {
    this.createFileReport();

    this.flows.forEach((flow: APITFlow) => {
      flow.services.forEach((service: APITTest) => {
        this.testsRunExpectResult.push({
          status: 'no-run',
          service: service.id,
        });
      });
    });

    const promises = this.flows.map((flow: APITFlow) => {
      console.log(`RUNNING FLOW ${flow.name}`);
      console.log('--------------------------------');
      return flow.services.reduce((promise, service: APITTest) => {
        return promise.then(() => {
          return service.service.service
            .request({
              method: service.service.service.defaults.method,
              url: service.service.service.defaults.baseURL,
              data: service.body,
              headers: this.replaceHeadersWithSavedData(service.headers),
            })
            .then((response: AxiosResponse) => {
              service.expects(response.data);
              this.addExpectResultOrReplaceIfExist(service.id, 'success');
              this.logData(service.service.id, response);
              this.saveTestData(response, service.id);
            })
            .catch((error: any) => {
              this.addExpectResultOrReplaceIfExist(service.id, 'failed');
              console.log(`Error on service ${service.service.id}`);
              console.error(error);
            });
        });
      }, Promise.resolve());
    });
    await Promise.all(promises);
  }

  private addExpectResultOrReplaceIfExist(serviceId: string, status: string) {
    const index = this.testsRunExpectResult.findIndex(
      (expect:any) => expect.service === serviceId,
    );
    if (index > -1) {
      this.testsRunExpectResult[index] = {
        status: status,
        service: serviceId,
      };
    } else {
      this.testsRunExpectResult.push({
        status: status,
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

  private replaceHeadersWithSavedData(headers: any) {
    let headersString = JSON.stringify(headers);
    const regex = /@@([a-zA-Z0-9_.]+)/g;
    const matches = headersString.match(regex);
    if (!matches) return headers;

    matches.forEach((match) => {
      const cleanMatch = match.split('@@')[1];
      const parentId = cleanMatch.split('.')[0];
      const value = cleanMatch.replace(parentId + '.', '');
      const data = this.testSavedData.find(
        (savedData) => savedData.parentId === parentId,
      );
      if (data) {
        const valueToReplace = this.getValueByPath(data.value, value);
        headersString = headersString.replace(match, valueToReplace);
      }
    });

    return JSON.parse(headersString);
  }

  private getValueByPath(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  private sliceDataLength(data:any, forConsole = false) {
    if (!data) return false;

    let dataString = forConsole
      ? JSON.stringify(data)
      : JSON.stringify(data, null, 4);

    if (forConsole && dataString.length > 150) {
      dataString = dataString.slice(0, 150);
    }

    return forConsole ? dataString : ' ```\n' + dataString + '\n``` ';
  }

  private createFileReport() {
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
    fs.writeFileSync(this.filePath, '');
  }
  private createMermaidReport() {
    if (fs.existsSync('mermaid-' + this.filePath)) {
      fs.unlinkSync('mermaid-' + this.filePath);
    }
    fs.writeFileSync('mermaid-' + this.filePath, '');
  }

  private appendToReport(content: string) {
    fs.appendFileSync(this.filePath, content);
  }

  private appendToReportMermaid(content: string) {
    fs.appendFileSync('mermaid-' + this.filePath, content);
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
    } catch (e) {
      return false;
    }
  }

  private async createMermaidGraph() {
    this.appendToReportMermaid('```mermaid\n graph LR\n');
    for (let i = 0; i < this.testsRunExpectResult.length; i++) {
      if (i === this.testsRunExpectResult.length - 1) {
        break;
      }
      this.appendToReportMermaid(
        `${this.testsRunExpectResult[i].service} --> ${this.testsRunExpectResult[i + 1].service}\n`,
      );
    }

    for (let i = 0; i < this.testsRunExpectResult.length; i++) {
      if (this.testsRunExpectResult[i].status === 'failed') {
        this.appendToReportMermaid(
          `style ${this.testsRunExpectResult[i].service} fill:${this.colorFailed}\n`,
        );
      } else if (this.testsRunExpectResult[i].status === 'success') {
        this.appendToReportMermaid(
          `style ${this.testsRunExpectResult[i].service} fill:${this.colorSuccess}\n`,
        );
      }
    }
    this.appendToReportMermaid('```');
  }
}

export class APIT {
  axios = require('axios');

  public static createService({
    id,
    endpoint,
    method,
  }: APITServiceCreate): APITService {
    return {
      id,
      service: axios.create({
        baseURL: endpoint,
        method: method,
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
