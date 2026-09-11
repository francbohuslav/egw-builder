type InfoStructure = {
  projects: {
    code: IProjectCode;
    supportTests: boolean;
    directory: string;
    branch: string;
  }[];
  gui: {
    branch: string;
  };
  additionalTests: string[];
  messageBroker: string;
  environmentFiles: string[];
};
