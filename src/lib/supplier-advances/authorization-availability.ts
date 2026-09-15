export function isSupplierAdvanceAuthorizationAvailable(
  hasAuthorizationPermission: boolean,
  eligibleCommitmentCount: number,
): boolean {
  return hasAuthorizationPermission && eligibleCommitmentCount > 0;
}
