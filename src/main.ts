import * as core from '@actions/core';
import {SemVer} from './semver'
import fs from 'fs';

function logAndExport(key: string, value: string) {
  core.info(`${key}=${value}`);
  core.exportVariable(key, value);
}

async function run(): Promise<void> {
  try {
    // Get the base version
    const baseVer = core.getInput("baseVersion", { required: true });

    // Get the branch mappings
    let branchMappings = new Map<string, string>();
    const mappingsLines = core.getInput("branchMappings").split("\n");
    for (const mapping of mappingsLines) {
      const mappingParts = mapping.trim().split(":");
      branchMappings.set(mappingParts[0].toLowerCase(), mappingParts[1]);
    }

    // Get the pre-release prefix
    let preReleasePrefix = core.getInput("prereleasePrefix") ?? "";

    // Action Env variables
    const runNo = process.env['GITHUB_RUN_NUMBER'];
    const sha = process.env['GITHUB_SHA'];
    const ref = process.env['GITHUB_REF'];

    // Process the input
    let verInfo = await SemVer(baseVer, branchMappings, preReleasePrefix, runNo!, sha!, ref!);

    // Log and push the values back to the workflow runner environment
    logAndExport("VERSION_TAG", verInfo.tag);
    logAndExport("SEMVER", verInfo.semVer);
    logAndExport("SEMVER_MAJOR", verInfo.major.toString());
    logAndExport("SEMVER_MINOR", verInfo.minor.toString());
    logAndExport("SEMVER_PATCH", verInfo.patch.toString());
    logAndExport("SEMVER_PRERELEASE", verInfo.preRelease);
    logAndExport("SEMVER_BUILD", verInfo.build);

    // Write out the version file
    const verFile = core.getInput("versionFile");
    fs.writeFile(verFile, verInfo.semVer, { encoding: "utf8" }, function (err) {
      if (err)
        throw err;

        console.log(`Wrote semver to ${verFile}`);
    });    
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
