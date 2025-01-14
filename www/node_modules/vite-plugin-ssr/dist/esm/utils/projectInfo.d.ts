export { projectInfo };
export type { ProjectTag };
type PackageName = typeof projectInfo.npmPackageName;
type ProjectVersion = typeof projectInfo.projectVersion;
type ProjectTag = `[${PackageName}]` | `[${PackageName}@${ProjectVersion}]`;
declare const projectInfo: {
    projectName: "vite-plugin-ssr";
    projectVersion: "0.4.142";
    npmPackageName: "vite-plugin-ssr";
    githubRepository: "https://github.com/brillout/vite-plugin-ssr";
};
