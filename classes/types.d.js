/**
 * @typedef {Object} IJavaAppInfo
 * @property {string} javaVersion
 * @property {string} maxMemory
 * @property {string} mainClassName
 */

/**
 * @typedef {"DG" | "MR" | "EMAIL" | "ECP" | "FTP" | "IEC62325" | "AS24" | "IEC60870" | "ACER" | "MERGED"} IProjectCode
 */

/**
 * @typedef {IProjectCode | "ASYNC"} IProjectCodeWithAsync
 */

/**
 * @typedef {Object} IProject Project
 * @property {IProjectCode} code one of DG, MR, EMAIL, ECP, FTP, IEC62325, AS24, IEC60870, ACER
 * @property {string} folder folder of project e.g. "uu_energygateway_datagatewayg01"
 * @property {string} server folder of server module e.g. "uu_energygateway_datagatewayg01-server"
 * @property {string} [hi] folder of HI module of MR, e.g. "uu_energygateway_messageregistryg01-hi"
 * @property {string} [uu5lib] folder of GUI components, e.g. "uu_energygateway_uu5lib"
 * @property {string} [gui] folder of GUI components, e.g. "uu_energygateway_uu5lib/uu_energygateway_guig01"
 * @property {string} [testFile] e.g. "message-registr.jmx"
 * @property {number} port e.g. 8093
 * @property {string} webname e.g. "uu-energygateway-messageregistryg01"
 * @property {(isVersion11: boolean) => Record<string, any>} [addProfilesFromLibraries]
 */
