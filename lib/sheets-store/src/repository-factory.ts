import { SheetsRepository } from "./repository";
import { WideSheetsRepository } from "./wide-repository";
import { isWideLayout } from "./wide-layout";

let _repo: SheetsRepository | WideSheetsRepository | null = null;

export function getSheetsRepository(): SheetsRepository | WideSheetsRepository {
  if (!_repo) {
    _repo = isWideLayout() ? new WideSheetsRepository() : new SheetsRepository();
  }
  return _repo;
}
