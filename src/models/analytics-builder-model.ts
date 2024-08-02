export class AnalyticsBuilderModel {
  id: number;
  name: string;
  description: string;
  state: string;
  builderVersion: string;
  mode: string;
  modeProperties: {};
  builderModel: {
    nodeDataArray: any[];
    linkDataArray: any[];
  };
  c8y_analyticsModel: {};
  type: string;
  templateParameters: any[];
  userInterfaceProperties: {
    displayGrid: boolean;
  };
  tags: any[];
  runtimeError: string;
  runtimeErrorLocalized: any[];
}
