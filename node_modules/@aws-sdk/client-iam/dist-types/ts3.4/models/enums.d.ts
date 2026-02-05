export declare const AccessAdvisorUsageGranularityType: {
  readonly ACTION_LEVEL: "ACTION_LEVEL";
  readonly SERVICE_LEVEL: "SERVICE_LEVEL";
};
export type AccessAdvisorUsageGranularityType =
  (typeof AccessAdvisorUsageGranularityType)[keyof typeof AccessAdvisorUsageGranularityType];
export declare const StatusType: {
  readonly Active: "Active";
  readonly Expired: "Expired";
  readonly Inactive: "Inactive";
};
export type StatusType = (typeof StatusType)[keyof typeof StatusType];
export declare const AssertionEncryptionModeType: {
  readonly Allowed: "Allowed";
  readonly Required: "Required";
};
export type AssertionEncryptionModeType =
  (typeof AssertionEncryptionModeType)[keyof typeof AssertionEncryptionModeType];
export declare const AssignmentStatusType: {
  readonly Any: "Any";
  readonly Assigned: "Assigned";
  readonly Unassigned: "Unassigned";
};
export type AssignmentStatusType =
  (typeof AssignmentStatusType)[keyof typeof AssignmentStatusType];
export declare const PermissionsBoundaryAttachmentType: {
  readonly Policy: "PermissionsBoundaryPolicy";
};
export type PermissionsBoundaryAttachmentType =
  (typeof PermissionsBoundaryAttachmentType)[keyof typeof PermissionsBoundaryAttachmentType];
export declare const PolicyParameterTypeEnum: {
  readonly STRING: "string";
  readonly STRING_LIST: "stringList";
};
export type PolicyParameterTypeEnum =
  (typeof PolicyParameterTypeEnum)[keyof typeof PolicyParameterTypeEnum];
export declare const FeatureType: {
  readonly ROOT_CREDENTIALS_MANAGEMENT: "RootCredentialsManagement";
  readonly ROOT_SESSIONS: "RootSessions";
};
export type FeatureType = (typeof FeatureType)[keyof typeof FeatureType];
export declare const ReportStateType: {
  readonly COMPLETE: "COMPLETE";
  readonly INPROGRESS: "INPROGRESS";
  readonly STARTED: "STARTED";
};
export type ReportStateType =
  (typeof ReportStateType)[keyof typeof ReportStateType];
export declare const EntityType: {
  readonly AWSManagedPolicy: "AWSManagedPolicy";
  readonly Group: "Group";
  readonly LocalManagedPolicy: "LocalManagedPolicy";
  readonly Role: "Role";
  readonly User: "User";
};
export type EntityType = (typeof EntityType)[keyof typeof EntityType];
export declare const SummaryKeyType: {
  readonly AccessKeysPerUserQuota: "AccessKeysPerUserQuota";
  readonly AccountAccessKeysPresent: "AccountAccessKeysPresent";
  readonly AccountMFAEnabled: "AccountMFAEnabled";
  readonly AccountPasswordPresent: "AccountPasswordPresent";
  readonly AccountSigningCertificatesPresent: "AccountSigningCertificatesPresent";
  readonly AssumeRolePolicySizeQuota: "AssumeRolePolicySizeQuota";
  readonly AttachedPoliciesPerGroupQuota: "AttachedPoliciesPerGroupQuota";
  readonly AttachedPoliciesPerRoleQuota: "AttachedPoliciesPerRoleQuota";
  readonly AttachedPoliciesPerUserQuota: "AttachedPoliciesPerUserQuota";
  readonly GlobalEndpointTokenVersion: "GlobalEndpointTokenVersion";
  readonly GroupPolicySizeQuota: "GroupPolicySizeQuota";
  readonly Groups: "Groups";
  readonly GroupsPerUserQuota: "GroupsPerUserQuota";
  readonly GroupsQuota: "GroupsQuota";
  readonly InstanceProfiles: "InstanceProfiles";
  readonly InstanceProfilesQuota: "InstanceProfilesQuota";
  readonly MFADevices: "MFADevices";
  readonly MFADevicesInUse: "MFADevicesInUse";
  readonly Policies: "Policies";
  readonly PoliciesQuota: "PoliciesQuota";
  readonly PolicySizeQuota: "PolicySizeQuota";
  readonly PolicyVersionsInUse: "PolicyVersionsInUse";
  readonly PolicyVersionsInUseQuota: "PolicyVersionsInUseQuota";
  readonly Providers: "Providers";
  readonly RolePolicySizeQuota: "RolePolicySizeQuota";
  readonly Roles: "Roles";
  readonly RolesQuota: "RolesQuota";
  readonly ServerCertificates: "ServerCertificates";
  readonly ServerCertificatesQuota: "ServerCertificatesQuota";
  readonly SigningCertificatesPerUserQuota: "SigningCertificatesPerUserQuota";
  readonly UserPolicySizeQuota: "UserPolicySizeQuota";
  readonly Users: "Users";
  readonly UsersQuota: "UsersQuota";
  readonly VersionsPerPolicyQuota: "VersionsPerPolicyQuota";
};
export type SummaryKeyType =
  (typeof SummaryKeyType)[keyof typeof SummaryKeyType];
export declare const ReportFormatType: {
  readonly text_csv: "text/csv";
};
export type ReportFormatType =
  (typeof ReportFormatType)[keyof typeof ReportFormatType];
export declare const StateType: {
  readonly ACCEPTED: "ACCEPTED";
  readonly ASSIGNED: "ASSIGNED";
  readonly EXPIRED: "EXPIRED";
  readonly FINALIZED: "FINALIZED";
  readonly PENDING_APPROVAL: "PENDING_APPROVAL";
  readonly REJECTED: "REJECTED";
  readonly UNASSIGNED: "UNASSIGNED";
};
export type StateType = (typeof StateType)[keyof typeof StateType];
export declare const PermissionCheckResultType: {
  readonly ALLOWED: "ALLOWED";
  readonly DENIED: "DENIED";
  readonly UNSURE: "UNSURE";
};
export type PermissionCheckResultType =
  (typeof PermissionCheckResultType)[keyof typeof PermissionCheckResultType];
export declare const PermissionCheckStatusType: {
  readonly COMPLETE: "COMPLETE";
  readonly FAILED: "FAILED";
  readonly IN_PROGRESS: "IN_PROGRESS";
};
export type PermissionCheckStatusType =
  (typeof PermissionCheckStatusType)[keyof typeof PermissionCheckStatusType];
export declare const SummaryStateType: {
  readonly AVAILABLE: "AVAILABLE";
  readonly FAILED: "FAILED";
  readonly NOT_AVAILABLE: "NOT_AVAILABLE";
  readonly NOT_SUPPORTED: "NOT_SUPPORTED";
};
export type SummaryStateType =
  (typeof SummaryStateType)[keyof typeof SummaryStateType];
export declare const SortKeyType: {
  readonly LAST_AUTHENTICATED_TIME_ASCENDING: "LAST_AUTHENTICATED_TIME_ASCENDING";
  readonly LAST_AUTHENTICATED_TIME_DESCENDING: "LAST_AUTHENTICATED_TIME_DESCENDING";
  readonly SERVICE_NAMESPACE_ASCENDING: "SERVICE_NAMESPACE_ASCENDING";
  readonly SERVICE_NAMESPACE_DESCENDING: "SERVICE_NAMESPACE_DESCENDING";
};
export type SortKeyType = (typeof SortKeyType)[keyof typeof SortKeyType];
export declare const JobStatusType: {
  readonly COMPLETED: "COMPLETED";
  readonly FAILED: "FAILED";
  readonly IN_PROGRESS: "IN_PROGRESS";
};
export type JobStatusType = (typeof JobStatusType)[keyof typeof JobStatusType];
export declare const PolicyOwnerEntityType: {
  readonly GROUP: "GROUP";
  readonly ROLE: "ROLE";
  readonly USER: "USER";
};
export type PolicyOwnerEntityType =
  (typeof PolicyOwnerEntityType)[keyof typeof PolicyOwnerEntityType];
export declare const DeletionTaskStatusType: {
  readonly FAILED: "FAILED";
  readonly IN_PROGRESS: "IN_PROGRESS";
  readonly NOT_STARTED: "NOT_STARTED";
  readonly SUCCEEDED: "SUCCEEDED";
};
export type DeletionTaskStatusType =
  (typeof DeletionTaskStatusType)[keyof typeof DeletionTaskStatusType];
export declare const EncodingType: {
  readonly PEM: "PEM";
  readonly SSH: "SSH";
};
export type EncodingType = (typeof EncodingType)[keyof typeof EncodingType];
export declare const PolicyUsageType: {
  readonly PermissionsBoundary: "PermissionsBoundary";
  readonly PermissionsPolicy: "PermissionsPolicy";
};
export type PolicyUsageType =
  (typeof PolicyUsageType)[keyof typeof PolicyUsageType];
export declare const PolicyScopeType: {
  readonly AWS: "AWS";
  readonly All: "All";
  readonly Local: "Local";
};
export type PolicyScopeType =
  (typeof PolicyScopeType)[keyof typeof PolicyScopeType];
export declare const PolicyType: {
  readonly INLINE: "INLINE";
  readonly MANAGED: "MANAGED";
};
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];
export declare const GlobalEndpointTokenVersion: {
  readonly v1Token: "v1Token";
  readonly v2Token: "v2Token";
};
export type GlobalEndpointTokenVersion =
  (typeof GlobalEndpointTokenVersion)[keyof typeof GlobalEndpointTokenVersion];
export declare const ContextKeyTypeEnum: {
  readonly BINARY: "binary";
  readonly BINARY_LIST: "binaryList";
  readonly BOOLEAN: "boolean";
  readonly BOOLEAN_LIST: "booleanList";
  readonly DATE: "date";
  readonly DATE_LIST: "dateList";
  readonly IP: "ip";
  readonly IP_LIST: "ipList";
  readonly NUMERIC: "numeric";
  readonly NUMERIC_LIST: "numericList";
  readonly STRING: "string";
  readonly STRING_LIST: "stringList";
};
export type ContextKeyTypeEnum =
  (typeof ContextKeyTypeEnum)[keyof typeof ContextKeyTypeEnum];
export declare const PolicyEvaluationDecisionType: {
  readonly ALLOWED: "allowed";
  readonly EXPLICIT_DENY: "explicitDeny";
  readonly IMPLICIT_DENY: "implicitDeny";
};
export type PolicyEvaluationDecisionType =
  (typeof PolicyEvaluationDecisionType)[keyof typeof PolicyEvaluationDecisionType];
export declare const PolicySourceType: {
  readonly AWS_MANAGED: "aws-managed";
  readonly GROUP: "group";
  readonly NONE: "none";
  readonly RESOURCE: "resource";
  readonly ROLE: "role";
  readonly USER: "user";
  readonly USER_MANAGED: "user-managed";
};
export type PolicySourceType =
  (typeof PolicySourceType)[keyof typeof PolicySourceType];
