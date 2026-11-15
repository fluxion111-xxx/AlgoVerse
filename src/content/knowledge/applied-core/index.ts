import { architectureTopics } from "./architecture";
import { compilerWorkflowTopics } from "./compiler-workflow";
import { databaseDiagnosticTopics } from "./database-diagnostics";
import { networkDiagnosticTopics } from "./network-diagnostics";
import { osDiagnosticTopics } from "./os-diagnostics";

export const appliedCoreTopics = {
  "operating-systems": [...architectureTopics, ...osDiagnosticTopics],
  networks: networkDiagnosticTopics,
  databases: databaseDiagnosticTopics,
  programming: compilerWorkflowTopics,
};
