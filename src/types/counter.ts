export type CounterType = "quotation" | "invoice" | "payment" | "project";

export interface Counter {
  type: CounterType;
  year: number;
  sequence: number;
  prefix: string;
  exampleFormat: string;
}
