import type { BuilderConfig } from "./config";
import type { Project, ProjectCode } from "./types";

/** Health check URL of the application is `/<webName>/<HEALTH_CHECK_UID>/sys/getHealth`. Any awid works, the apps use the first one. */
export const HEALTH_CHECK_UID = "00000000000000000000000000000001";
/** Awid of the AsyncJob application which runs in docker. */
export const ASYNC_JOB_UID = "99000000000000000000000000000000";
export const ASYNC_JOB_PORT = 10090;
/** Port of the BSg02 (payload storage) docker container. */
export const BSG02_PORT = 10091;
/** Payload persistence strategy which needs no extra docker profile or Java argument. */
export const DEFAULT_PAYLOAD_PERSISTENCE_STRATEGY = "BSg01";
/** Environment file used when neither the command line nor the repository suggests one. */
export const DEFAULT_ENVIRONMENT_FILE = "env_localhost_builder";

/** Folder with GUI libraries and the folder with GUI components inside it. Both are relative to the repository which contains them. */
export const GUI_LIB_FOLDER = "uu_energygateway_uu5lib";
export const GUI_COMPONENTS_FOLDER = `${GUI_LIB_FOLDER}/uu_energygateway_guig01`;

const DG_CONFIG = "uu_energygateway_datagatewayg01-config";
const DG_ENDPOINT = "uu_energygateway_datagatewayg01-endpoint";
const DG_ASYNC = "uu_energygateway_datagatewayg01-async";
const DG_TERRITORY = "uu_energygateway_datagatewayg01-business-territory";

/** Libraries which every endpoint takes from the Data Gateway. */
const ENDPOINT_PROFILES: Record<string, ProjectCode> = {
  [DG_CONFIG]: "DG",
  [DG_ENDPOINT]: "DG",
  [DG_TERRITORY]: "DG",
};

/**
 * Creates the list of all projects with the folders from the config.
 * The order matters: it is the order of building, starting of apps and printing of the results.
 *
 * Returned objects are mutable on purpose, `resolveProjectLayout()` fixes the names according to the repositories on the disk.
 */
export function createProjects(config: BuilderConfig): Project[] {
  const f = config.folders;
  return [
    {
      code: "DG",
      folder: f.DG,
      server: "uu_energygateway_datagatewayg01-server",
      port: 8094,
      webName: "uu-energygateway-datagatewayg01",
      testFile: "datagateway.jmx",
      libraryProfiles: {
        "uu_energygateway_datagatewayg01-server-lib": "DG",
        [DG_CONFIG]: "DG",
        [DG_TERRITORY]: "DG",
      },
    },
    {
      code: "MR",
      folder: f.MR,
      server: "uu_energygateway_messageregistryg01-server",
      port: 8093,
      webName: "uu-energygateway-messageregistryg01",
      hi: "uu_energygateway_messageregistryg01-hi",
      testFile: "message-registry.jmx",
      libraryProfiles: {
        [DG_CONFIG]: "DG",
        [DG_ASYNC]: "DG",
        [DG_TERRITORY]: "DG",
        "uu_energygateway_messageregistryg01-uulib": "MR",
      },
    },
    {
      code: "FTP",
      folder: f.FTP,
      server: "uu_energygatewayg01_ftpendpoint-server",
      port: 8095,
      webName: "uu-energygatewayg01-ftpendpoint",
      testFile: "ftp_endpoint.jmx",
      libraryProfiles: {
        [DG_CONFIG]: "DG",
        [DG_ENDPOINT]: "DG",
        [DG_ASYNC]: "DG",
        [DG_TERRITORY]: "DG",
        "uu_energygateway_ftpendpointg01-uulib": "FTP",
      },
    },
    {
      code: "EMAIL",
      folder: f.EMAIL,
      server: "uu_energygatewayg01_emailendpoint-server",
      port: 8096,
      webName: "uu-energygatewayg01-emailendpoint",
      testFile: "email_endpoint.jmx",
      libraryProfiles: {
        [DG_CONFIG]: "DG",
        [DG_ENDPOINT]: "DG",
        [DG_ASYNC]: "DG",
        [DG_TERRITORY]: "DG",
        "uu_energygateway_emailendpointg01-uulib": "EMAIL",
      },
    },
    {
      code: "ECP",
      folder: f.ECP,
      server: "uu_energygatewayg01_ecpendpoint-server",
      port: 8097,
      webName: "uu-energygatewayg01-ecpendpoint",
      testFile: "ecp_endpoint.jmx",
      libraryProfiles: {
        ...ENDPOINT_PROFILES,
        "uu_energygateway_ecpendpointg01-uulib": "ECP",
      },
    },
    {
      code: "IEC62325",
      folder: f.IEC62325,
      server: "uu_energygateway_iec62325endpointg01-server",
      port: 8098,
      webName: "uu-energygateway-iec62325endpointg01",
      testFile: "iec62325_endpoint.jmx",
      libraryProfiles: { ...ENDPOINT_PROFILES },
    },
    {
      code: "AS24",
      folder: f.AS24,
      server: "uu_energygateway_as24endpointg01-server",
      port: 8099,
      webName: "uu-energygateway-as24endpointg01",
      testFile: "as24_endpoint.jmx",
      libraryProfiles: {
        ...ENDPOINT_PROFILES,
        "uu_energygateway_as2endpoint-uulib": "AS24",
        "uu_energygateway_as4endpoint-uulib": "AS24",
      },
    },
    {
      code: "IEC60870",
      folder: f.IEC60870,
      server: "uu_energygateway_iec60870-5-endpointg01-server",
      port: 8100,
      webName: "uu-energygateway-iec60870endpointg01",
      testFile: "iec60870_endpoint.jmx",
      libraryProfiles: { ...ENDPOINT_PROFILES },
    },
    {
      code: "ACER",
      folder: f.ACER,
      server: "uu_energygateway_acerendpointg01-server",
      port: 8101,
      webName: "uu-energygateway-acerendpointg01",
      testFile: "acer_endpoint.jmx",
      libraryProfiles: { ...ENDPOINT_PROFILES },
    },
    {
      code: "KAFKA",
      folder: f.KAFKA,
      server: "uu_energygateway_kafkaendpointg01-server",
      port: 8102,
      webName: "uu-energygateway-kafkaendpointg01",
      testFile: "kafka_endpoint.jmx",
      libraryProfiles: { ...ENDPOINT_PROFILES },
    },
    {
      code: "HTTP",
      folder: f.HTTP,
      server: "uu_energygateway_httpendpointg01-server",
      port: 8103,
      webName: "uu-energygateway-httpendpointg01",
      testFile: "http_endpoint.jmx",
      libraryProfiles: { ...ENDPOINT_PROFILES },
    },
    {
      code: "MERGED",
      folder: f.MERGED,
      server: "uu_energygateway_mergedg01-server",
      hi: "uu_energygateway_mergedg01-hi",
      port: 8800,
      webName: "uu-energygateway-mergedg01",
      libraryProfiles: {},
    },
  ];
}
