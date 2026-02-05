/**
 * @public
 * @enum
 */
export declare const AccessAdvisorUsageGranularityType: {
    readonly ACTION_LEVEL: "ACTION_LEVEL";
    readonly SERVICE_LEVEL: "SERVICE_LEVEL";
};
/**
 * @public
 */
export type AccessAdvisorUsageGranularityType = (typeof AccessAdvisorUsageGranularityType)[keyof typeof AccessAdvisorUsageGranularityType];
/**
 * @public
 * @enum
 */
export declare const StatusType: {
    readonly Active: "Active";
    readonly Expired: "Expired";
    readonly Inactive: "Inactive";
};
/**
 * @public
 */
export type StatusType = (typeof StatusType)[keyof typeof StatusType];
/**
 * @public
 * @enum
 */
export declare const AssertionEncryptionModeType: {
    readonly Allowed: "Allowed";
    readonly Required: "Required";
};
/**
 * @public
 */
export type AssertionEncryptionModeType = (typeof AssertionEncryptionModeType)[keyof typeof AssertionEncryptionModeType];
/**
 * @public
 * @enum
 */
export declare const AssignmentStatusType: {
    readonly Any: "Any";
    readonly Assigned: "Assigned";
    readonly Unassigned: "Unassigned";
};
/**
 * @public
 */
export type AssignmentStatusType = (typeof AssignmentStatusType)[keyof typeof AssignmentStatusType];
/**
 * @public
 * @enum
 */
export declare const PermissionsBoundaryAttachmentType: {
    readonly Policy: "PermissionsBoundaryPolicy";
};
/**
 * @public
 */
export type PermissionsBoundaryAttachmentType = (typeof PermissionsBoundaryAttachmentType)[keyof typeof PermissionsBoundaryAttachmentType];
/**
 * @public
 * @enum
 */
export declare const PolicyParameterTypeEnum: {
    readonly STRING: "string";
    readonly STRING_LIST: "stringList";
};
/**
 * @public
 */
export type PolicyParameterTypeEnum = (typeof PolicyParameterTypeEnum)[keyof typeof PolicyParameterTypeEnum];
/**
 * @public
 * @enum
 */
export declare const FeatureType: {
    readonly ROOT_CREDENTIALS_MANAGEMENT: "RootCredentialsManagement";
    readonly ROOT_SESSIONS: "RootSessions";
};
/**
 * @public
 */
export type FeatureType = (typeof FeatureType)[keyof typeof FeatureType];
/**
 * @public
 * @enum
 */
export declare const ReportStateType: {
    readonly COMPLETE: "COMPLETE";
    readonly INPROGRESS: "INPROGRESS";
    readonly STARTED: "STARTED";
};
/**
 * @public
 */
export type ReportStateType = (typeof ReportStateType)[keyof typeof ReportStateType];
/**
 * @public
 * @enum
 */
export declare const EntityType: {
    readonly AWSManagedPolicy: "AWSManagedPolicy";
    readonly Group: "Group";
    readonly LocalManagedPolicy: "LocalManagedPolicy";
    readonly Role: "Role";
    readonly User: "User";
};
/**
 * @public
 */
export type EntityType = (typeof EntityType)[keyof typeof EntityType];
/**
 * @public
 * @enum
 */
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
/**
 * @public
 */
export type SummaryKeyType = (typeof SummaryKeyType)[keyof typeof SummaryKeyType];
/**
 * @public
 * @enum
 */
export declare const ReportFormatType: {
    readonly text_csv: "text/csv";
};
/**
 * @public
 */
export type ReportFormatType = (typeof ReportFormatType)[keyof typeof ReportFormatType];
/**
 * @public
 * @enum
 */
export declare const StateType: {
    readonly ACCEPTED: "ACCEPTED";
    readonly ASSIGNED: "ASSIGNED";
    readonly EXPIRED: "EXPIRED";
    readonly FINALIZED: "FINALIZED";
    readonly PENDING_APPROVAL: "PENDING_APPROVAL";
    readonly REJECTED: "REJECTED";
    readonly UNASSIGNED: "UNASSIGNED";
};
/**
 * @public
 */
export type StateType = (typeof StateType)[keyof typeof StateType];
/**
 * @public
 * @enum
 */
export declare const PermissionCheckResultType: {
    readonly ALLOWED: "ALLOWED";
    readonly DENIED: "DENIED";
    readonly UNSURE: "UNSURE";
};
/**
 * @public
 */
export type PermissionCheckResultType = (typeof PermissionCheckResultType)[keyof typeof PermissionCheckResultType];
/**
 * @public
 * @enum
 */
export declare const PermissionCheckStatusType: {
    readonly COMPLETE: "COMPLETE";
    readonly FAILED: "FAILED";
    readonly IN_PROGRESS: "IN_PROGRESS";
};
/**
 * @public
 */
export type PermissionCheckStatusType = (typeof PermissionCheckStatusType)[keyof typeof PermissionCheckStatusType];
/**
 * @public
 * @enum
 */
export declare const SummaryStateType: {
    readonly AVAILABLE: "AVAILABLE";
    readonly FAILED: "FAILED";
    readonly NOT_AVAILABLE: "NOT_AVAILABLE";
    readonly NOT_SUPPORTED: "NOT_SUPPORTED";
};
/**
 * @public
 */
export type SummaryStateType = (typeof SummaryStateType)[keyof typeof SummaryStateType];
/**
 * @public
 * @enum
 */
export declare const SortKeyType: {
    readonly LAST_AUTHENTICATED_TIME_ASCENDING: "LAST_AUTHENTICATED_TIME_ASCENDING";
    readonly LAST_AUTHENTICATED_TIME_DESCENDING: "LAST_AUTHENTICATED_TIME_DESCENDING";
    readonly SERVICE_NAMESPACE_ASCENDING: "SERVICE_NAMESPACE_ASCENDING";
    readonly SERVICE_NAMESPACE_DESCENDING: "SERVICE_NAMESPACE_DESCENDING";
};
/**
 * @public
 */
export type SortKeyType = (typeof SortKeyType)[keyof typeof SortKeyType];
/**
 * @public
 * @enum
 */
export declare const JobStatusType: {
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
    readonly IN_PROGRESS: "IN_PROGRESS";
};
/**
 * @public
 */
export type JobStatusType = (typeof JobStatusType)[keyof typeof JobStatusType];
/**
 * @public
 * @enum
 */
export declare const PolicyOwnerEntityType: {
    readonly GROUP: "GROUP";
    readonly ROLE: "ROLE";
    readonly USER: "USER";
};
/**
 * @public
 */
export type PolicyOwnerEntityType = (typeof PolicyOwnerEntityType)[keyof typeof PolicyOwnerEntityType];
/**
 * @public
 * @enum
 */
export declare const DeletionTaskStatusType: {
    readonly FAILED: "FAILED";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly NOT_STARTED: "NOT_STARTED";
    readonly SUCCEEDED: "SUCCEEDED";
};
/**
 * @public
 */
export type DeletionTaskStatusType = (typeof DeletionTaskStatusType)[keyof typeof DeletionTaskStatusType];
/**
 * @public
 * @enum
 */
export declare const EncodingType: {
    readonly PEM: "PEM";
    readonly SSH: "SSH";
};
/**
 * @public
 */
export type EncodingType = (typeof EncodingType)[keyof typeof EncodingType];
/**
 * @public
 * @enum
 */
export declare const PolicyUsageType: {
    readonly PermissionsBoundary: "PermissionsBoundary";
    readonly PermissionsPolicy: "PermissionsPolicy";
};
/**
 * @public
 */
export type PolicyUsageType = (typeof PolicyUsageType)[keyof typeof PolicyUsageType];
/**
 * @public
 * @enum
 */
export declare const PolicyScopeType: {
    readonly AWS: "AWS";
    readonly All: "All";
    readonly Local: "Local";
};
/**
 * @public
 */
export type PolicyScopeType = (typeof PolicyScopeType)[keyof typeof PolicyScopeType];
/**
 * @public
 * @enum
 */
export declare const PolicyType: {
    readonly INLINE: "INLINE";
    readonly MANAGED: "MANAGED";
};
/**
 * @public
 */
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];
/**
 * @public
 * @enum
 */
export declare const GlobalEndpointTokenVersion: {
    readonly v1Token: "v1Token";
    readonly v2Token: "v2Token";
};
/**
 * @public
 */
export type GlobalEndpointTokenVersion = (typeof GlobalEndpointTokenVersion)[keyof typeof GlobalEndpointTokenVersion];
/**
 * @public
 * @enum
 */
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
/**
 * @public
 */
export type ContextKeyTypeEnum = (typeof ContextKeyTypeEnum)[keyof typeof ContextKeyTypeEnum];
/**
 * @public
 * @enum
 */
export declare const PolicyEvaluationDecisionType: {
    readonly ALLOWED: "allowed";
    readonly EXPLICIT_DENY: "explicitDeny";
    readonly IMPLICIT_DENY: "implicitDeny";
};
/**
 * @public
 */
export type PolicyEvaluationDecisionType = (typeof PolicyEvaluationDecisionType)[keyof typeof PolicyEvaluationDecisionType];
/**
 * @public
 * @enum
 */
export declare const PolicySourceType: {
    readonly AWS_MANAGED: "aws-managed";
    readonly GROUP: "group";
    readonly NONE: "none";
    readonly RESOURCE: "resource";
    readonly ROLE: "role";
    readonly USER: "user";
    readonly USER_MANAGED: "user-managed";
};
/**
 * @public
 */
export type PolicySourceType = (typeof PolicySourceType)[keyof typeof PolicySourceType];
