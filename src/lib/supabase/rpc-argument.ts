import type { Database } from "./database.types";

type PublicFunctions = Database["public"]["Functions"];

type FunctionArguments<Name extends keyof PublicFunctions> = PublicFunctions[Name] extends {
  Args: infer Arguments;
}
  ? Arguments
  : never;

export type RpcArgument<
  Name extends keyof PublicFunctions,
  Argument extends keyof FunctionArguments<Name>,
> = FunctionArguments<Name>[Argument];
