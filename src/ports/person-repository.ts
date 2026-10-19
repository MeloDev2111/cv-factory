/** Reads raw (unvalidated) data of people. Validation is the app layer's job. */
export interface PersonRepository {
  listPeople(): Promise<string[]>;
  loadSource(person: string): Promise<unknown>;
  listVariants(person: string): Promise<string[]>;
  loadVariant(person: string, name: string): Promise<unknown>;
}
