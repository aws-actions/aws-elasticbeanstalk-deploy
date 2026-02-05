export const AccessAdvisorUsageGranularityType = {
    ACTION_LEVEL: "ACTION_LEVEL",
    SERVICE_LEVEL: "SERVICE_LEVEL",
};
export const StatusType = {
    Active: "Active",
    Expired: "Expired",
    Inactive: "Inactive",
};
export const AssertionEncryptionModeType = {
    Allowed: "Allowed",
    Required: "Required",
};
export const AssignmentStatusType = {
    Any: "Any",
    Assigned: "Assigned",
    Unassigned: "Unassigned",
};
export const PermissionsBoundaryAttachmentType = {
    Policy: "PermissionsBoundaryPolicy",
};
export const PolicyParameterTypeEnum = {
    STRING: "string",
    STRING_LIST: "stringList",
};
export const FeatureType = {
    ROOT_CREDENTIALS_MANAGEMENT: "RootCredentialsManagement",
    ROOT_SESSIONS: "RootSessions",
};
export const ReportStateType = {
    COMPLETE: "COMPLETE",
    INPROGRESS: "INPROGRESS",
    STARTED: "STARTED",
};
export const EntityType = {
    AWSManagedPolicy: "AWSManagedPolicy",
    Group: "Group",
    LocalManagedPolicy: "LocalManagedPolicy",
    Role: "Role",
    User: "User",
};
export const SummaryKeyType = {
    AccessKeysPerUserQuota: "AccessKeysPerUserQuota",
    AccountAccessKeysPresent: "AccountAccessKeysPresent",
    AccountMFAEnabled: "AccountMFAEnabled",
    AccountPasswordPresent: "AccountPasswordPresent",
    AccountSigningCertificatesPresent: "AccountSigningCertificatesPresent",
    AssumeRolePolicySizeQuota: "AssumeRolePolicySizeQuota",
    AttachedPoliciesPerGroupQuota: "AttachedPoliciesPerGroupQuota",
    AttachedPoliciesPerRoleQuota: "AttachedPoliciesPerRoleQuota",
    AttachedPoliciesPerUserQuota: "AttachedPoliciesPerUserQuota",
    GlobalEndpointTokenVersion: "GlobalEndpointTokenVersion",
    GroupPolicySizeQuota: "GroupPolicySizeQuota",
    Groups: "Groups",
    GroupsPerUserQuota: "GroupsPerUserQuota",
    GroupsQuota: "GroupsQuota",
    InstanceProfiles: "InstanceProfiles",
    InstanceProfilesQuota: "InstanceProfilesQuota",
    MFADevices: "MFADevices",
    MFADevicesInUse: "MFADevicesInUse",
    Policies: "Policies",
    PoliciesQuota: "PoliciesQuota",
    PolicySizeQuota: "PolicySizeQuota",
    PolicyVersionsInUse: "PolicyVersionsInUse",
    PolicyVersionsInUseQuota: "PolicyVersionsInUseQuota",
    Providers: "Providers",
    RolePolicySizeQuota: "RolePolicySizeQuota",
    Roles: "Roles",
    RolesQuota: "RolesQuota",
    ServerCertificates: "ServerCertificates",
    ServerCertificatesQuota: "ServerCertificatesQuota",
    SigningCertificatesPerUserQuota: "SigningCertificatesPerUserQuota",
    UserPolicySizeQuota: "UserPolicySizeQuota",
    Users: "Users",
    UsersQuota: "UsersQuota",
    VersionsPerPolicyQuota: "VersionsPerPolicyQuota",
};
export const ReportFormatType = {
    text_csv: "text/csv",
};
export const StateType = {
    ACCEPTED: "ACCEPTED",
    ASSIGNED: "ASSIGNED",
    EXPIRED: "EXPIRED",
    FINALIZED: "FINALIZED",
    PENDING_APPROVAL: "PENDING_APPROVAL",
    REJECTED: "REJECTED",
    UNASSIGNED: "UNASSIGNED",
};
export const PermissionCheckResultType = {
    ALLOWED: "ALLOWED",
    DENIED: "DENIED",
    UNSURE: "UNSURE",
};
export const PermissionCheckStatusType = {
    COMPLETE: "COMPLETE",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
};
export const SummaryStateType = {
    AVAILABLE: "AVAILABLE",
    FAILED: "FAILED",
    NOT_AVAILABLE: "NOT_AVAILABLE",
    NOT_SUPPORTED: "NOT_SUPPORTED",
};
export const SortKeyType = {
    LAST_AUTHENTICATED_TIME_ASCENDING: "LAST_AUTHENTICATED_TIME_ASCENDING",
    LAST_AUTHENTICATED_TIME_DESCENDING: "LAST_AUTHENTICATED_TIME_DESCENDING",
    SERVICE_NAMESPACE_ASCENDING: "SERVICE_NAMESPACE_ASCENDING",
    SERVICE_NAMESPACE_DESCENDING: "SERVICE_NAMESPACE_DESCENDING",
};
export const JobStatusType = {
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
};
export const PolicyOwnerEntityType = {
    GROUP: "GROUP",
    ROLE: "ROLE",
    USER: "USER",
};
export const DeletionTaskStatusType = {
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
    NOT_STARTED: "NOT_STARTED",
    SUCCEEDED: "SUCCEEDED",
};
export const EncodingType = {
    PEM: "PEM",
    SSH: "SSH",
};
export const PolicyUsageType = {
    PermissionsBoundary: "PermissionsBoundary",
    PermissionsPolicy: "PermissionsPolicy",
};
export const PolicyScopeType = {
    AWS: "AWS",
    All: "All",
    Local: "Local",
};
export const PolicyType = {
    INLINE: "INLINE",
    MANAGED: "MANAGED",
};
export const GlobalEndpointTokenVersion = {
    v1Token: "v1Token",
    v2Token: "v2Token",
};
export const ContextKeyTypeEnum = {
    BINARY: "binary",
    BINARY_LIST: "binaryList",
    BOOLEAN: "boolean",
    BOOLEAN_LIST: "booleanList",
    DATE: "date",
    DATE_LIST: "dateList",
    IP: "ip",
    IP_LIST: "ipList",
    NUMERIC: "numeric",
    NUMERIC_LIST: "numericList",
    STRING: "string",
    STRING_LIST: "stringList",
};
export const PolicyEvaluationDecisionType = {
    ALLOWED: "allowed",
    EXPLICIT_DENY: "explicitDeny",
    IMPLICIT_DENY: "implicitDeny",
};
export const PolicySourceType = {
    AWS_MANAGED: "aws-managed",
    GROUP: "group",
    NONE: "none",
    RESOURCE: "resource",
    ROLE: "role",
    USER: "user",
    USER_MANAGED: "user-managed",
};
