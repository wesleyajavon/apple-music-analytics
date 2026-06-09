export function isGrantedConsentCurrent(
  record: { granted: boolean; consentVersion: string } | null | undefined,
  requiredVersion: string
): boolean {
  return record?.granted === true && record.consentVersion === requiredVersion;
}
