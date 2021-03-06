import YAML_SCHEMA from "./ymlParsingSchema";
import { transformArgsToDict, replaceStacknameOpt } from "./helpers";

const fs = require("fs");
const path = require("path");
const YAML = require("js-yaml");

function parseYaml(yamlString) {
  return YAML.load(yamlString, { schema: YAML_SCHEMA });
}

class ServerlessConfigParser {
  constructor(program) {
    const { args, location } = program;
    const options = transformArgsToDict(args);
    const ymlPath = path.join(location, "serverless.yml");
    const yamlPath = path.join(location, "serverless.yaml");
    const jsonPath = path.join(location, "serverless.json");

    if (fs.existsSync(ymlPath)) {
      this.config = parseYaml(fs.readFileSync(ymlPath, { encoding: "utf-8" }));
    } else if (fs.existsSync(yamlPath)) {
      this.config = parseYaml(fs.readFileSync(yamlPath, { encoding: "utf-8" }));
    } else if (fs.existsSync(jsonPath)) {
      this.config = JSON.parse(fs.readFileSync(jsonPath).toString("utf8"));
    }

    if (!this.config) return;

    if (this.isNameNotInService()) {
      const name = this.config.service;
      this.config.service = { name };
    }

    this.config.service.name = replaceStacknameOpt(
      this.config.service.name,
      options
    );
  }

  isNameNotInService() {
    return (
      (typeof this.config.service === "object" &&
        !("name" in this.config.service)) ||
      !(typeof this.config.service === "object")
    );
  }

  getFunctionConfig(functionName) {
    if (this.config && this.config.functions) {
      return this.config.functions[functionName];
    }
    return undefined;
  }

  getTimeout(functionName) {
    const config = this.getFunctionConfig(functionName);
    if (config && config.timeout) {
      return config.timeout;
    }
    return undefined;
  }

  getMemorySize(functionName) {
    const config = this.getFunctionConfig(functionName);
    if (config && config.memorySize) {
      return config.memorySize;
    }
    return undefined;
  }

  getStage() {
    if (typeof this.config !== "object") {
      return "dev";
    }
    if (
      this.config.provider &&
      this.config.provider.stage &&
      typeof this.config.provider.stage === "string" &&
      this.config.provider.stage[0] !== "$"
    ) {
      return `${this.config.provider.stage}`;
    }
    return "dev";
  }

  getStackName(stage) {
    if (typeof this.config !== "object") {
      return null;
    }
    if (
      this.config.provider &&
      this.config.provider.stackName &&
      typeof this.config.provider.stackName === "string"
    ) {
      return `${this.config.provider.stackName}`;
    }
    if (typeof this.config.service === "string") {
      return `${this.config.service}-${stage}`;
    }
    return `${this.config.service.name}-${stage}`;
  }

  getRegion() {
    if (typeof this.config !== "object") {
      return null;
    }
    if (
      this.config.provider &&
      this.config.provider.region &&
      typeof this.config.provider.region === "string" &&
      this.config.provider.region[0] !== "$"
    ) {
      return `${this.config.provider.region}`;
    }
    return null;
  }
}

export default ServerlessConfigParser;
