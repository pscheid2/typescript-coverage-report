import getCoverage, { Options, CoverageData } from "./getCoverage";
import { generate as generateText } from "./reporters/text";
import { generate as generateHTML } from "./reporters/html";
import { generate as generateJSON } from "./reporters/json";
import path from "path";
import fs from "fs";
import { ncp } from "ncp";
import { promisify } from "util";
import rimraf from "rimraf";

const asyncNcp = promisify(ncp);

export type ProgramOptions = Options & {
  outputDir: string;
  threshold: number;
  includeFiles?: string;
};

export default async function generateCoverageReport(
  options: ProgramOptions
): Promise<CoverageData> {
  // NOTE: Cleanup the folder
  const dirPath = path.join(process.cwd(), options.outputDir);

  const data = await getCoverage({
    tsProjectFile: options.tsProjectFile,
    strict: options.strict,
    debug: options.debug,
    ignoreFiles: options.ignoreFiles,
    ignoreCatch: options.ignoreCatch,
    ignoreUnread: options.ignoreUnread,
    cache: options.cache
  });

  let filteredFileCounts = data.fileCounts;
  if (options.includeFiles != null) {
    const includeFiles = options.includeFiles.split(" ");

    const { fileCounts } = data;
    filteredFileCounts = new Map(
      Array.from(fileCounts).filter(([key]) => {
        return includeFiles.includes(key);
      })
    );
  }

  console.log(
    generateText({ ...data, fileCounts: filteredFileCounts }, options.threshold)
  );

  if (fs.existsSync(dirPath)) {
    rimraf.sync(dirPath);
  }

  await generateHTML(data, options);
  await asyncNcp(
    path.join(__dirname, "../../assets"),
    path.join(process.cwd(), options.outputDir, "assets")
  );

  await generateJSON(data, options);

  return data;
}
