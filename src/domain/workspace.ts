import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { BuilderError } from "../infra/errors";
import type { BuilderConfig } from "./config";
import { createProjects, GUI_COMPONENTS_FOLDER, GUI_LIB_FOLDER } from "./projects";
import type { Project, ProjectCode } from "./types";

/**
 * Repositories of older EGW versions use different names of the server module and of the application in URL.
 * If the server folder with the current name does not exist, the legacy name is replaced by the new one.
 */
const RENAMED_SERVERS: Partial<Record<ProjectCode, { server: [from: string, to: string]; webName: [from: string, to: string] }>> = {
  FTP: {
    server: ["uu_energygatewayg01_ftpendpoint", "uu_energygateway_ftpendpointg01"],
    webName: ["uu-energygatewayg01-ftpendpoint", "uu-energygateway-ftpendpointg01"],
  },
  EMAIL: {
    server: ["uu_energygatewayg01_emailendpoint", "uu_energygateway_emailendpointg01"],
    webName: ["uu-energygatewayg01-emailendpoint", "uu-energygateway-emailendpointg01"],
  },
  ECP: {
    server: ["uu_energygatewayg01_ecpendpoint", "uu_energygateway_ecpendpointg01"],
    webName: ["uu-energygatewayg01-ecpendpoint", "uu-energygateway-ecpendpointg01"],
  },
};

/**
 * The EGW root folder (the folder with all repositories) and everything derived from it.
 *
 * All paths are built from {@link root} and are absolute, so the builder never changes its working directory
 * and a failed step cannot leave the process in an unexpected folder.
 */
export class Workspace {
  /** Projects in the order of building / starting / reporting. */
  readonly projects: Project[];
  /** GUI libraries folder, relative to the root. Lives in the MR repository or in the separate GUI repository. */
  readonly uu5libFolder: string;
  /** GUI components folder, relative to the root. */
  readonly guiFolder: string;

  /**
   * @param root absolute path of the folder with the repositories
   * @param builderDir absolute path of the builder itself
   */
  constructor(
    readonly root: string,
    readonly builderDir: string,
    readonly config: BuilderConfig,
  ) {
    this.projects = createProjects(config);
    this.fixRenamedServerFolders();
    // The GUI sources moved from a separate repository into MR. Detect where they are by the existence of package.json.
    const guiInMr = existsSync(join(root, config.folders.MR, GUI_COMPONENTS_FOLDER, "package.json"));
    const guiRepository = guiInMr ? config.folders.MR : config.folders.GUI;
    this.uu5libFolder = join(guiRepository, GUI_LIB_FOLDER);
    this.guiFolder = join(guiRepository, GUI_COMPONENTS_FOLDER);
  }

  project(code: ProjectCode): Project {
    const project = this.projects.find((p) => p.code === code);
    if (!project) {
      throw new BuilderError(`Unknown project ${code}`);
    }
    return project;
  }

  /** Absolute path of a path relative to the root. */
  path(...parts: string[]): string {
    return resolve(this.root, ...parts);
  }

  /** Absolute path of the repository of the project. */
  dir(project: Project): string {
    return this.path(project.folder);
  }

  /** Absolute path of the server module of the project. */
  serverDir(project: Project): string {
    return this.path(project.folder, project.server);
  }

  /** Folder with JMeter tests, inits and environment files. It is part of MR. */
  get jmeterDir(): string {
    return join(this.serverDir(this.project("MR")), "src", "test", "jmeter");
  }

  /** Folder where the logs of the started apps are written. */
  get logsDir(): string {
    return join(this.root, "logs");
  }

  /** True if the repository of the project is checked out. */
  isInstalled(project: Project): boolean {
    return existsSync(this.dir(project));
  }

  /** Projects whose repository is checked out. */
  get installedProjects(): Project[] {
    return this.projects.filter((p) => this.isInstalled(p));
  }

  /** Projects which can be started: always the core ones, the optional endpoints only if installed. */
  get runnableProjects(): Project[] {
    const alwaysRunnable: ProjectCode[] = ["DG", "MR", "FTP", "EMAIL", "ECP"];
    return this.projects.filter((p) => alwaysRunnable.includes(p.code) || this.isInstalled(p));
  }

  private fixRenamedServerFolders(): void {
    for (const project of this.projects) {
      if (!this.isInstalled(project)) {
        continue;
      }
      // build.gradle is versioned, so its existence proves that the server folder is the right one
      if (existsSync(join(this.serverDir(project), "build.gradle"))) {
        continue;
      }
      const renamed = RENAMED_SERVERS[project.code];
      const originalServer = project.server;
      if (renamed) {
        project.server = project.server.replace(...renamed.server);
        project.webName = project.webName.replace(...renamed.webName);
      }
      if (!existsSync(this.serverDir(project))) {
        throw new BuilderError(`Server folder ${project.folder}/${project.server} neither ${project.folder}/${originalServer} exists`);
      }
    }
  }
}
