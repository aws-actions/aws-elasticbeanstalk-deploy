import {
  AccessAdvisorUsageGranularityType,
  AssertionEncryptionModeType,
  AssignmentStatusType,
  ContextKeyTypeEnum,
  DeletionTaskStatusType,
  EncodingType,
  EntityType,
  FeatureType,
  GlobalEndpointTokenVersion,
  JobStatusType,
  PermissionCheckResultType,
  PermissionCheckStatusType,
  PermissionsBoundaryAttachmentType,
  PolicyEvaluationDecisionType,
  PolicyOwnerEntityType,
  PolicyParameterTypeEnum,
  PolicyScopeType,
  PolicySourceType,
  PolicyType,
  PolicyUsageType,
  ReportFormatType,
  ReportStateType,
  SortKeyType,
  StateType,
  StatusType,
  SummaryKeyType,
  SummaryStateType,
} from "./enums";
export interface AcceptDelegationRequestRequest {
  DelegationRequestId: string | undefined;
}
export interface AccessDetail {
  ServiceName: string | undefined;
  ServiceNamespace: string | undefined;
  Region?: string | undefined;
  EntityPath?: string | undefined;
  LastAuthenticatedTime?: Date | undefined;
  TotalAuthenticatedEntities?: number | undefined;
}
export interface AccessKey {
  UserName: string | undefined;
  AccessKeyId: string | undefined;
  Status: StatusType | undefined;
  SecretAccessKey: string | undefined;
  CreateDate?: Date | undefined;
}
export interface AccessKeyLastUsed {
  LastUsedDate?: Date | undefined;
  ServiceName: string | undefined;
  Region: string | undefined;
}
export interface AccessKeyMetadata {
  UserName?: string | undefined;
  AccessKeyId?: string | undefined;
  Status?: StatusType | undefined;
  CreateDate?: Date | undefined;
}
export interface AddClientIDToOpenIDConnectProviderRequest {
  OpenIDConnectProviderArn: string | undefined;
  ClientID: string | undefined;
}
export interface AddRoleToInstanceProfileRequest {
  InstanceProfileName: string | undefined;
  RoleName: string | undefined;
}
export interface AddUserToGroupRequest {
  GroupName: string | undefined;
  UserName: string | undefined;
}
export interface AssociateDelegationRequestRequest {
  DelegationRequestId: string | undefined;
}
export interface AttachedPermissionsBoundary {
  PermissionsBoundaryType?: PermissionsBoundaryAttachmentType | undefined;
  PermissionsBoundaryArn?: string | undefined;
}
export interface AttachedPolicy {
  PolicyName?: string | undefined;
  PolicyArn?: string | undefined;
}
export interface AttachGroupPolicyRequest {
  GroupName: string | undefined;
  PolicyArn: string | undefined;
}
export interface AttachRolePolicyRequest {
  RoleName: string | undefined;
  PolicyArn: string | undefined;
}
export interface AttachUserPolicyRequest {
  UserName: string | undefined;
  PolicyArn: string | undefined;
}
export interface ChangePasswordRequest {
  OldPassword: string | undefined;
  NewPassword: string | undefined;
}
export interface CreateAccessKeyRequest {
  UserName?: string | undefined;
}
export interface CreateAccessKeyResponse {
  AccessKey: AccessKey | undefined;
}
export interface CreateAccountAliasRequest {
  AccountAlias: string | undefined;
}
export interface PolicyParameter {
  Name?: string | undefined;
  Values?: string[] | undefined;
  Type?: PolicyParameterTypeEnum | undefined;
}
export interface DelegationPermission {
  PolicyTemplateArn?: string | undefined;
  Parameters?: PolicyParameter[] | undefined;
}
export interface CreateDelegationRequestRequest {
  OwnerAccountId?: string | undefined;
  Description: string | undefined;
  Permissions: DelegationPermission | undefined;
  RequestMessage?: string | undefined;
  RequestorWorkflowId: string | undefined;
  RedirectUrl?: string | undefined;
  NotificationChannel: string | undefined;
  SessionDuration: number | undefined;
  OnlySendByOwner?: boolean | undefined;
}
export interface CreateDelegationRequestResponse {
  ConsoleDeepLink?: string | undefined;
  DelegationRequestId?: string | undefined;
}
export interface CreateGroupRequest {
  Path?: string | undefined;
  GroupName: string | undefined;
}
export interface Group {
  Path: string | undefined;
  GroupName: string | undefined;
  GroupId: string | undefined;
  Arn: string | undefined;
  CreateDate: Date | undefined;
}
export interface CreateGroupResponse {
  Group: Group | undefined;
}
export interface Tag {
  Key: string | undefined;
  Value: string | undefined;
}
export interface CreateInstanceProfileRequest {
  InstanceProfileName: string | undefined;
  Path?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface RoleLastUsed {
  LastUsedDate?: Date | undefined;
  Region?: string | undefined;
}
export interface Role {
  Path: string | undefined;
  RoleName: string | undefined;
  RoleId: string | undefined;
  Arn: string | undefined;
  CreateDate: Date | undefined;
  AssumeRolePolicyDocument?: string | undefined;
  Description?: string | undefined;
  MaxSessionDuration?: number | undefined;
  PermissionsBoundary?: AttachedPermissionsBoundary | undefined;
  Tags?: Tag[] | undefined;
  RoleLastUsed?: RoleLastUsed | undefined;
}
export interface InstanceProfile {
  Path: string | undefined;
  InstanceProfileName: string | undefined;
  InstanceProfileId: string | undefined;
  Arn: string | undefined;
  CreateDate: Date | undefined;
  Roles: Role[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateInstanceProfileResponse {
  InstanceProfile: InstanceProfile | undefined;
}
export interface CreateLoginProfileRequest {
  UserName?: string | undefined;
  Password?: string | undefined;
  PasswordResetRequired?: boolean | undefined;
}
export interface LoginProfile {
  UserName: string | undefined;
  CreateDate: Date | undefined;
  PasswordResetRequired?: boolean | undefined;
}
export interface CreateLoginProfileResponse {
  LoginProfile: LoginProfile | undefined;
}
export interface CreateOpenIDConnectProviderRequest {
  Url: string | undefined;
  ClientIDList?: string[] | undefined;
  ThumbprintList?: string[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateOpenIDConnectProviderResponse {
  OpenIDConnectProviderArn?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreatePolicyRequest {
  PolicyName: string | undefined;
  Path?: string | undefined;
  PolicyDocument: string | undefined;
  Description?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface Policy {
  PolicyName?: string | undefined;
  PolicyId?: string | undefined;
  Arn?: string | undefined;
  Path?: string | undefined;
  DefaultVersionId?: string | undefined;
  AttachmentCount?: number | undefined;
  PermissionsBoundaryUsageCount?: number | undefined;
  IsAttachable?: boolean | undefined;
  Description?: string | undefined;
  CreateDate?: Date | undefined;
  UpdateDate?: Date | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreatePolicyResponse {
  Policy?: Policy | undefined;
}
export interface CreatePolicyVersionRequest {
  PolicyArn: string | undefined;
  PolicyDocument: string | undefined;
  SetAsDefault?: boolean | undefined;
}
export interface PolicyVersion {
  Document?: string | undefined;
  VersionId?: string | undefined;
  IsDefaultVersion?: boolean | undefined;
  CreateDate?: Date | undefined;
}
export interface CreatePolicyVersionResponse {
  PolicyVersion?: PolicyVersion | undefined;
}
export interface CreateRoleRequest {
  Path?: string | undefined;
  RoleName: string | undefined;
  AssumeRolePolicyDocument: string | undefined;
  Description?: string | undefined;
  MaxSessionDuration?: number | undefined;
  PermissionsBoundary?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateRoleResponse {
  Role: Role | undefined;
}
export interface CreateSAMLProviderRequest {
  SAMLMetadataDocument: string | undefined;
  Name: string | undefined;
  Tags?: Tag[] | undefined;
  AssertionEncryptionMode?: AssertionEncryptionModeType | undefined;
  AddPrivateKey?: string | undefined;
}
export interface CreateSAMLProviderResponse {
  SAMLProviderArn?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateServiceLinkedRoleRequest {
  AWSServiceName: string | undefined;
  Description?: string | undefined;
  CustomSuffix?: string | undefined;
}
export interface CreateServiceLinkedRoleResponse {
  Role?: Role | undefined;
}
export interface CreateServiceSpecificCredentialRequest {
  UserName: string | undefined;
  ServiceName: string | undefined;
  CredentialAgeDays?: number | undefined;
}
export interface ServiceSpecificCredential {
  CreateDate: Date | undefined;
  ExpirationDate?: Date | undefined;
  ServiceName: string | undefined;
  ServiceUserName?: string | undefined;
  ServicePassword?: string | undefined;
  ServiceCredentialAlias?: string | undefined;
  ServiceCredentialSecret?: string | undefined;
  ServiceSpecificCredentialId: string | undefined;
  UserName: string | undefined;
  Status: StatusType | undefined;
}
export interface CreateServiceSpecificCredentialResponse {
  ServiceSpecificCredential?: ServiceSpecificCredential | undefined;
}
export interface CreateUserRequest {
  Path?: string | undefined;
  UserName: string | undefined;
  PermissionsBoundary?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface User {
  Path: string | undefined;
  UserName: string | undefined;
  UserId: string | undefined;
  Arn: string | undefined;
  CreateDate: Date | undefined;
  PasswordLastUsed?: Date | undefined;
  PermissionsBoundary?: AttachedPermissionsBoundary | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateUserResponse {
  User?: User | undefined;
}
export interface CreateVirtualMFADeviceRequest {
  Path?: string | undefined;
  VirtualMFADeviceName: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface VirtualMFADevice {
  SerialNumber: string | undefined;
  Base32StringSeed?: Uint8Array | undefined;
  QRCodePNG?: Uint8Array | undefined;
  User?: User | undefined;
  EnableDate?: Date | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateVirtualMFADeviceResponse {
  VirtualMFADevice: VirtualMFADevice | undefined;
}
export interface DeactivateMFADeviceRequest {
  UserName?: string | undefined;
  SerialNumber: string | undefined;
}
export interface DeleteAccessKeyRequest {
  UserName?: string | undefined;
  AccessKeyId: string | undefined;
}
export interface DeleteAccountAliasRequest {
  AccountAlias: string | undefined;
}
export interface DeleteGroupRequest {
  GroupName: string | undefined;
}
export interface DeleteGroupPolicyRequest {
  GroupName: string | undefined;
  PolicyName: string | undefined;
}
export interface DeleteInstanceProfileRequest {
  InstanceProfileName: string | undefined;
}
export interface DeleteLoginProfileRequest {
  UserName?: string | undefined;
}
export interface DeleteOpenIDConnectProviderRequest {
  OpenIDConnectProviderArn: string | undefined;
}
export interface DeletePolicyRequest {
  PolicyArn: string | undefined;
}
export interface DeletePolicyVersionRequest {
  PolicyArn: string | undefined;
  VersionId: string | undefined;
}
export interface DeleteRoleRequest {
  RoleName: string | undefined;
}
export interface DeleteRolePermissionsBoundaryRequest {
  RoleName: string | undefined;
}
export interface DeleteRolePolicyRequest {
  RoleName: string | undefined;
  PolicyName: string | undefined;
}
export interface DeleteSAMLProviderRequest {
  SAMLProviderArn: string | undefined;
}
export interface DeleteServerCertificateRequest {
  ServerCertificateName: string | undefined;
}
export interface DeleteServiceLinkedRoleRequest {
  RoleName: string | undefined;
}
export interface DeleteServiceLinkedRoleResponse {
  DeletionTaskId: string | undefined;
}
export interface DeleteServiceSpecificCredentialRequest {
  UserName?: string | undefined;
  ServiceSpecificCredentialId: string | undefined;
}
export interface DeleteSigningCertificateRequest {
  UserName?: string | undefined;
  CertificateId: string | undefined;
}
export interface DeleteSSHPublicKeyRequest {
  UserName: string | undefined;
  SSHPublicKeyId: string | undefined;
}
export interface DeleteUserRequest {
  UserName: string | undefined;
}
export interface DeleteUserPermissionsBoundaryRequest {
  UserName: string | undefined;
}
export interface DeleteUserPolicyRequest {
  UserName: string | undefined;
  PolicyName: string | undefined;
}
export interface DeleteVirtualMFADeviceRequest {
  SerialNumber: string | undefined;
}
export interface DetachGroupPolicyRequest {
  GroupName: string | undefined;
  PolicyArn: string | undefined;
}
export interface DetachRolePolicyRequest {
  RoleName: string | undefined;
  PolicyArn: string | undefined;
}
export interface DetachUserPolicyRequest {
  UserName: string | undefined;
  PolicyArn: string | undefined;
}
export interface DisableOrganizationsRootCredentialsManagementRequest {}
export interface DisableOrganizationsRootCredentialsManagementResponse {
  OrganizationId?: string | undefined;
  EnabledFeatures?: FeatureType[] | undefined;
}
export interface DisableOrganizationsRootSessionsRequest {}
export interface DisableOrganizationsRootSessionsResponse {
  OrganizationId?: string | undefined;
  EnabledFeatures?: FeatureType[] | undefined;
}
export interface EnableMFADeviceRequest {
  UserName: string | undefined;
  SerialNumber: string | undefined;
  AuthenticationCode1: string | undefined;
  AuthenticationCode2: string | undefined;
}
export interface EnableOrganizationsRootCredentialsManagementRequest {}
export interface EnableOrganizationsRootCredentialsManagementResponse {
  OrganizationId?: string | undefined;
  EnabledFeatures?: FeatureType[] | undefined;
}
export interface EnableOrganizationsRootSessionsRequest {}
export interface EnableOrganizationsRootSessionsResponse {
  OrganizationId?: string | undefined;
  EnabledFeatures?: FeatureType[] | undefined;
}
export interface EnableOutboundWebIdentityFederationResponse {
  IssuerIdentifier?: string | undefined;
}
export interface GenerateCredentialReportResponse {
  State?: ReportStateType | undefined;
  Description?: string | undefined;
}
export interface GenerateOrganizationsAccessReportRequest {
  EntityPath: string | undefined;
  OrganizationsPolicyId?: string | undefined;
}
export interface GenerateOrganizationsAccessReportResponse {
  JobId?: string | undefined;
}
export interface GenerateServiceLastAccessedDetailsRequest {
  Arn: string | undefined;
  Granularity?: AccessAdvisorUsageGranularityType | undefined;
}
export interface GenerateServiceLastAccessedDetailsResponse {
  JobId?: string | undefined;
}
export interface GetAccessKeyLastUsedRequest {
  AccessKeyId: string | undefined;
}
export interface GetAccessKeyLastUsedResponse {
  UserName?: string | undefined;
  AccessKeyLastUsed?: AccessKeyLastUsed | undefined;
}
export interface GetAccountAuthorizationDetailsRequest {
  Filter?: EntityType[] | undefined;
  MaxItems?: number | undefined;
  Marker?: string | undefined;
}
export interface PolicyDetail {
  PolicyName?: string | undefined;
  PolicyDocument?: string | undefined;
}
export interface GroupDetail {
  Path?: string | undefined;
  GroupName?: string | undefined;
  GroupId?: string | undefined;
  Arn?: string | undefined;
  CreateDate?: Date | undefined;
  GroupPolicyList?: PolicyDetail[] | undefined;
  AttachedManagedPolicies?: AttachedPolicy[] | undefined;
}
export interface ManagedPolicyDetail {
  PolicyName?: string | undefined;
  PolicyId?: string | undefined;
  Arn?: string | undefined;
  Path?: string | undefined;
  DefaultVersionId?: string | undefined;
  AttachmentCount?: number | undefined;
  PermissionsBoundaryUsageCount?: number | undefined;
  IsAttachable?: boolean | undefined;
  Description?: string | undefined;
  CreateDate?: Date | undefined;
  UpdateDate?: Date | undefined;
  PolicyVersionList?: PolicyVersion[] | undefined;
}
export interface RoleDetail {
  Path?: string | undefined;
  RoleName?: string | undefined;
  RoleId?: string | undefined;
  Arn?: string | undefined;
  CreateDate?: Date | undefined;
  AssumeRolePolicyDocument?: string | undefined;
  InstanceProfileList?: InstanceProfile[] | undefined;
  RolePolicyList?: PolicyDetail[] | undefined;
  AttachedManagedPolicies?: AttachedPolicy[] | undefined;
  PermissionsBoundary?: AttachedPermissionsBoundary | undefined;
  Tags?: Tag[] | undefined;
  RoleLastUsed?: RoleLastUsed | undefined;
}
export interface UserDetail {
  Path?: string | undefined;
  UserName?: string | undefined;
  UserId?: string | undefined;
  Arn?: string | undefined;
  CreateDate?: Date | undefined;
  UserPolicyList?: PolicyDetail[] | undefined;
  GroupList?: string[] | undefined;
  AttachedManagedPolicies?: AttachedPolicy[] | undefined;
  PermissionsBoundary?: AttachedPermissionsBoundary | undefined;
  Tags?: Tag[] | undefined;
}
export interface GetAccountAuthorizationDetailsResponse {
  UserDetailList?: UserDetail[] | undefined;
  GroupDetailList?: GroupDetail[] | undefined;
  RoleDetailList?: RoleDetail[] | undefined;
  Policies?: ManagedPolicyDetail[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface PasswordPolicy {
  MinimumPasswordLength?: number | undefined;
  RequireSymbols?: boolean | undefined;
  RequireNumbers?: boolean | undefined;
  RequireUppercaseCharacters?: boolean | undefined;
  RequireLowercaseCharacters?: boolean | undefined;
  AllowUsersToChangePassword?: boolean | undefined;
  ExpirePasswords?: boolean | undefined;
  MaxPasswordAge?: number | undefined;
  PasswordReusePrevention?: number | undefined;
  HardExpiry?: boolean | undefined;
}
export interface GetAccountPasswordPolicyResponse {
  PasswordPolicy: PasswordPolicy | undefined;
}
export interface GetAccountSummaryResponse {
  SummaryMap?: Partial<Record<SummaryKeyType, number>> | undefined;
}
export interface GetContextKeysForCustomPolicyRequest {
  PolicyInputList: string[] | undefined;
}
export interface GetContextKeysForPolicyResponse {
  ContextKeyNames?: string[] | undefined;
}
export interface GetContextKeysForPrincipalPolicyRequest {
  PolicySourceArn: string | undefined;
  PolicyInputList?: string[] | undefined;
}
export interface GetCredentialReportResponse {
  Content?: Uint8Array | undefined;
  ReportFormat?: ReportFormatType | undefined;
  GeneratedTime?: Date | undefined;
}
export interface GetDelegationRequestRequest {
  DelegationRequestId: string | undefined;
  DelegationPermissionCheck?: boolean | undefined;
}
export interface DelegationRequest {
  DelegationRequestId?: string | undefined;
  OwnerAccountId?: string | undefined;
  Description?: string | undefined;
  RequestMessage?: string | undefined;
  Permissions?: DelegationPermission | undefined;
  PermissionPolicy?: string | undefined;
  RolePermissionRestrictionArns?: string[] | undefined;
  OwnerId?: string | undefined;
  ApproverId?: string | undefined;
  State?: StateType | undefined;
  ExpirationTime?: Date | undefined;
  RequestorId?: string | undefined;
  RequestorName?: string | undefined;
  CreateDate?: Date | undefined;
  SessionDuration?: number | undefined;
  RedirectUrl?: string | undefined;
  Notes?: string | undefined;
  RejectionReason?: string | undefined;
  OnlySendByOwner?: boolean | undefined;
  UpdatedTime?: Date | undefined;
}
export interface GetDelegationRequestResponse {
  DelegationRequest?: DelegationRequest | undefined;
  PermissionCheckStatus?: PermissionCheckStatusType | undefined;
  PermissionCheckResult?: PermissionCheckResultType | undefined;
}
export interface GetGroupRequest {
  GroupName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface GetGroupResponse {
  Group: Group | undefined;
  Users: User[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface GetGroupPolicyRequest {
  GroupName: string | undefined;
  PolicyName: string | undefined;
}
export interface GetGroupPolicyResponse {
  GroupName: string | undefined;
  PolicyName: string | undefined;
  PolicyDocument: string | undefined;
}
export interface GetHumanReadableSummaryRequest {
  EntityArn: string | undefined;
  Locale?: string | undefined;
}
export interface GetHumanReadableSummaryResponse {
  SummaryContent?: string | undefined;
  Locale?: string | undefined;
  SummaryState?: SummaryStateType | undefined;
}
export interface GetInstanceProfileRequest {
  InstanceProfileName: string | undefined;
}
export interface GetInstanceProfileResponse {
  InstanceProfile: InstanceProfile | undefined;
}
export interface GetLoginProfileRequest {
  UserName?: string | undefined;
}
export interface GetLoginProfileResponse {
  LoginProfile: LoginProfile | undefined;
}
export interface GetMFADeviceRequest {
  SerialNumber: string | undefined;
  UserName?: string | undefined;
}
export interface GetMFADeviceResponse {
  UserName?: string | undefined;
  SerialNumber: string | undefined;
  EnableDate?: Date | undefined;
  Certifications?: Record<string, string> | undefined;
}
export interface GetOpenIDConnectProviderRequest {
  OpenIDConnectProviderArn: string | undefined;
}
export interface GetOpenIDConnectProviderResponse {
  Url?: string | undefined;
  ClientIDList?: string[] | undefined;
  ThumbprintList?: string[] | undefined;
  CreateDate?: Date | undefined;
  Tags?: Tag[] | undefined;
}
export interface GetOrganizationsAccessReportRequest {
  JobId: string | undefined;
  MaxItems?: number | undefined;
  Marker?: string | undefined;
  SortKey?: SortKeyType | undefined;
}
export interface ErrorDetails {
  Message: string | undefined;
  Code: string | undefined;
}
export interface GetOrganizationsAccessReportResponse {
  JobStatus: JobStatusType | undefined;
  JobCreationDate: Date | undefined;
  JobCompletionDate?: Date | undefined;
  NumberOfServicesAccessible?: number | undefined;
  NumberOfServicesNotAccessed?: number | undefined;
  AccessDetails?: AccessDetail[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
  ErrorDetails?: ErrorDetails | undefined;
}
export interface GetOutboundWebIdentityFederationInfoResponse {
  IssuerIdentifier?: string | undefined;
  JwtVendingEnabled?: boolean | undefined;
}
export interface GetPolicyRequest {
  PolicyArn: string | undefined;
}
export interface GetPolicyResponse {
  Policy?: Policy | undefined;
}
export interface GetPolicyVersionRequest {
  PolicyArn: string | undefined;
  VersionId: string | undefined;
}
export interface GetPolicyVersionResponse {
  PolicyVersion?: PolicyVersion | undefined;
}
export interface GetRoleRequest {
  RoleName: string | undefined;
}
export interface GetRoleResponse {
  Role: Role | undefined;
}
export interface GetRolePolicyRequest {
  RoleName: string | undefined;
  PolicyName: string | undefined;
}
export interface GetRolePolicyResponse {
  RoleName: string | undefined;
  PolicyName: string | undefined;
  PolicyDocument: string | undefined;
}
export interface GetSAMLProviderRequest {
  SAMLProviderArn: string | undefined;
}
export interface SAMLPrivateKey {
  KeyId?: string | undefined;
  Timestamp?: Date | undefined;
}
export interface GetSAMLProviderResponse {
  SAMLProviderUUID?: string | undefined;
  SAMLMetadataDocument?: string | undefined;
  CreateDate?: Date | undefined;
  ValidUntil?: Date | undefined;
  Tags?: Tag[] | undefined;
  AssertionEncryptionMode?: AssertionEncryptionModeType | undefined;
  PrivateKeyList?: SAMLPrivateKey[] | undefined;
}
export interface GetServerCertificateRequest {
  ServerCertificateName: string | undefined;
}
export interface ServerCertificateMetadata {
  Path: string | undefined;
  ServerCertificateName: string | undefined;
  ServerCertificateId: string | undefined;
  Arn: string | undefined;
  UploadDate?: Date | undefined;
  Expiration?: Date | undefined;
}
export interface ServerCertificate {
  ServerCertificateMetadata: ServerCertificateMetadata | undefined;
  CertificateBody: string | undefined;
  CertificateChain?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface GetServerCertificateResponse {
  ServerCertificate: ServerCertificate | undefined;
}
export interface GetServiceLastAccessedDetailsRequest {
  JobId: string | undefined;
  MaxItems?: number | undefined;
  Marker?: string | undefined;
}
export interface TrackedActionLastAccessed {
  ActionName?: string | undefined;
  LastAccessedEntity?: string | undefined;
  LastAccessedTime?: Date | undefined;
  LastAccessedRegion?: string | undefined;
}
export interface ServiceLastAccessed {
  ServiceName: string | undefined;
  LastAuthenticated?: Date | undefined;
  ServiceNamespace: string | undefined;
  LastAuthenticatedEntity?: string | undefined;
  LastAuthenticatedRegion?: string | undefined;
  TotalAuthenticatedEntities?: number | undefined;
  TrackedActionsLastAccessed?: TrackedActionLastAccessed[] | undefined;
}
export interface GetServiceLastAccessedDetailsResponse {
  JobStatus: JobStatusType | undefined;
  JobType?: AccessAdvisorUsageGranularityType | undefined;
  JobCreationDate: Date | undefined;
  ServicesLastAccessed: ServiceLastAccessed[] | undefined;
  JobCompletionDate: Date | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
  Error?: ErrorDetails | undefined;
}
export interface GetServiceLastAccessedDetailsWithEntitiesRequest {
  JobId: string | undefined;
  ServiceNamespace: string | undefined;
  MaxItems?: number | undefined;
  Marker?: string | undefined;
}
export interface EntityInfo {
  Arn: string | undefined;
  Name: string | undefined;
  Type: PolicyOwnerEntityType | undefined;
  Id: string | undefined;
  Path?: string | undefined;
}
export interface EntityDetails {
  EntityInfo: EntityInfo | undefined;
  LastAuthenticated?: Date | undefined;
}
export interface GetServiceLastAccessedDetailsWithEntitiesResponse {
  JobStatus: JobStatusType | undefined;
  JobCreationDate: Date | undefined;
  JobCompletionDate: Date | undefined;
  EntityDetailsList: EntityDetails[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
  Error?: ErrorDetails | undefined;
}
export interface GetServiceLinkedRoleDeletionStatusRequest {
  DeletionTaskId: string | undefined;
}
export interface RoleUsageType {
  Region?: string | undefined;
  Resources?: string[] | undefined;
}
export interface DeletionTaskFailureReasonType {
  Reason?: string | undefined;
  RoleUsageList?: RoleUsageType[] | undefined;
}
export interface GetServiceLinkedRoleDeletionStatusResponse {
  Status: DeletionTaskStatusType | undefined;
  Reason?: DeletionTaskFailureReasonType | undefined;
}
export interface GetSSHPublicKeyRequest {
  UserName: string | undefined;
  SSHPublicKeyId: string | undefined;
  Encoding: EncodingType | undefined;
}
export interface SSHPublicKey {
  UserName: string | undefined;
  SSHPublicKeyId: string | undefined;
  Fingerprint: string | undefined;
  SSHPublicKeyBody: string | undefined;
  Status: StatusType | undefined;
  UploadDate?: Date | undefined;
}
export interface GetSSHPublicKeyResponse {
  SSHPublicKey?: SSHPublicKey | undefined;
}
export interface GetUserRequest {
  UserName?: string | undefined;
}
export interface GetUserResponse {
  User: User | undefined;
}
export interface GetUserPolicyRequest {
  UserName: string | undefined;
  PolicyName: string | undefined;
}
export interface GetUserPolicyResponse {
  UserName: string | undefined;
  PolicyName: string | undefined;
  PolicyDocument: string | undefined;
}
export interface ListAccessKeysRequest {
  UserName?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListAccessKeysResponse {
  AccessKeyMetadata: AccessKeyMetadata[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListAccountAliasesRequest {
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListAccountAliasesResponse {
  AccountAliases: string[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListAttachedGroupPoliciesRequest {
  GroupName: string | undefined;
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListAttachedGroupPoliciesResponse {
  AttachedPolicies?: AttachedPolicy[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListAttachedRolePoliciesRequest {
  RoleName: string | undefined;
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListAttachedRolePoliciesResponse {
  AttachedPolicies?: AttachedPolicy[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListAttachedUserPoliciesRequest {
  UserName: string | undefined;
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListAttachedUserPoliciesResponse {
  AttachedPolicies?: AttachedPolicy[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListDelegationRequestsRequest {
  OwnerId?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListDelegationRequestsResponse {
  DelegationRequests?: DelegationRequest[] | undefined;
  Marker?: string | undefined;
  isTruncated?: boolean | undefined;
}
export interface ListEntitiesForPolicyRequest {
  PolicyArn: string | undefined;
  EntityFilter?: EntityType | undefined;
  PathPrefix?: string | undefined;
  PolicyUsageFilter?: PolicyUsageType | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface PolicyGroup {
  GroupName?: string | undefined;
  GroupId?: string | undefined;
}
export interface PolicyRole {
  RoleName?: string | undefined;
  RoleId?: string | undefined;
}
export interface PolicyUser {
  UserName?: string | undefined;
  UserId?: string | undefined;
}
export interface ListEntitiesForPolicyResponse {
  PolicyGroups?: PolicyGroup[] | undefined;
  PolicyUsers?: PolicyUser[] | undefined;
  PolicyRoles?: PolicyRole[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListGroupPoliciesRequest {
  GroupName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListGroupPoliciesResponse {
  PolicyNames: string[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListGroupsRequest {
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListGroupsResponse {
  Groups: Group[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListGroupsForUserRequest {
  UserName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListGroupsForUserResponse {
  Groups: Group[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListInstanceProfilesRequest {
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListInstanceProfilesResponse {
  InstanceProfiles: InstanceProfile[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListInstanceProfilesForRoleRequest {
  RoleName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListInstanceProfilesForRoleResponse {
  InstanceProfiles: InstanceProfile[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListInstanceProfileTagsRequest {
  InstanceProfileName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListInstanceProfileTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListMFADevicesRequest {
  UserName?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface MFADevice {
  UserName: string | undefined;
  SerialNumber: string | undefined;
  EnableDate: Date | undefined;
}
export interface ListMFADevicesResponse {
  MFADevices: MFADevice[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListMFADeviceTagsRequest {
  SerialNumber: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListMFADeviceTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListOpenIDConnectProvidersRequest {}
export interface OpenIDConnectProviderListEntry {
  Arn?: string | undefined;
}
export interface ListOpenIDConnectProvidersResponse {
  OpenIDConnectProviderList?: OpenIDConnectProviderListEntry[] | undefined;
}
export interface ListOpenIDConnectProviderTagsRequest {
  OpenIDConnectProviderArn: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListOpenIDConnectProviderTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListOrganizationsFeaturesRequest {}
export interface ListOrganizationsFeaturesResponse {
  OrganizationId?: string | undefined;
  EnabledFeatures?: FeatureType[] | undefined;
}
export interface ListPoliciesRequest {
  Scope?: PolicyScopeType | undefined;
  OnlyAttached?: boolean | undefined;
  PathPrefix?: string | undefined;
  PolicyUsageFilter?: PolicyUsageType | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListPoliciesResponse {
  Policies?: Policy[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListPoliciesGrantingServiceAccessRequest {
  Marker?: string | undefined;
  Arn: string | undefined;
  ServiceNamespaces: string[] | undefined;
}
export interface PolicyGrantingServiceAccess {
  PolicyName: string | undefined;
  PolicyType: PolicyType | undefined;
  PolicyArn?: string | undefined;
  EntityType?: PolicyOwnerEntityType | undefined;
  EntityName?: string | undefined;
}
export interface ListPoliciesGrantingServiceAccessEntry {
  ServiceNamespace?: string | undefined;
  Policies?: PolicyGrantingServiceAccess[] | undefined;
}
export interface ListPoliciesGrantingServiceAccessResponse {
  PoliciesGrantingServiceAccess:
    | ListPoliciesGrantingServiceAccessEntry[]
    | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListPolicyTagsRequest {
  PolicyArn: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListPolicyTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListPolicyVersionsRequest {
  PolicyArn: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListPolicyVersionsResponse {
  Versions?: PolicyVersion[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListRolePoliciesRequest {
  RoleName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListRolePoliciesResponse {
  PolicyNames: string[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListRolesRequest {
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListRolesResponse {
  Roles: Role[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListRoleTagsRequest {
  RoleName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListRoleTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListSAMLProvidersRequest {}
export interface SAMLProviderListEntry {
  Arn?: string | undefined;
  ValidUntil?: Date | undefined;
  CreateDate?: Date | undefined;
}
export interface ListSAMLProvidersResponse {
  SAMLProviderList?: SAMLProviderListEntry[] | undefined;
}
export interface ListSAMLProviderTagsRequest {
  SAMLProviderArn: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListSAMLProviderTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListServerCertificatesRequest {
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListServerCertificatesResponse {
  ServerCertificateMetadataList: ServerCertificateMetadata[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListServerCertificateTagsRequest {
  ServerCertificateName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListServerCertificateTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListServiceSpecificCredentialsRequest {
  UserName?: string | undefined;
  ServiceName?: string | undefined;
  AllUsers?: boolean | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ServiceSpecificCredentialMetadata {
  UserName: string | undefined;
  Status: StatusType | undefined;
  ServiceUserName?: string | undefined;
  ServiceCredentialAlias?: string | undefined;
  CreateDate: Date | undefined;
  ExpirationDate?: Date | undefined;
  ServiceSpecificCredentialId: string | undefined;
  ServiceName: string | undefined;
}
export interface ListServiceSpecificCredentialsResponse {
  ServiceSpecificCredentials?: ServiceSpecificCredentialMetadata[] | undefined;
  Marker?: string | undefined;
  IsTruncated?: boolean | undefined;
}
export interface ListSigningCertificatesRequest {
  UserName?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface SigningCertificate {
  UserName: string | undefined;
  CertificateId: string | undefined;
  CertificateBody: string | undefined;
  Status: StatusType | undefined;
  UploadDate?: Date | undefined;
}
export interface ListSigningCertificatesResponse {
  Certificates: SigningCertificate[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListSSHPublicKeysRequest {
  UserName?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface SSHPublicKeyMetadata {
  UserName: string | undefined;
  SSHPublicKeyId: string | undefined;
  Status: StatusType | undefined;
  UploadDate: Date | undefined;
}
export interface ListSSHPublicKeysResponse {
  SSHPublicKeys?: SSHPublicKeyMetadata[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListUserPoliciesRequest {
  UserName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListUserPoliciesResponse {
  PolicyNames: string[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListUsersRequest {
  PathPrefix?: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListUsersResponse {
  Users: User[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListUserTagsRequest {
  UserName: string | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListUserTagsResponse {
  Tags: Tag[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface ListVirtualMFADevicesRequest {
  AssignmentStatus?: AssignmentStatusType | undefined;
  Marker?: string | undefined;
  MaxItems?: number | undefined;
}
export interface ListVirtualMFADevicesResponse {
  VirtualMFADevices: VirtualMFADevice[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface PutGroupPolicyRequest {
  GroupName: string | undefined;
  PolicyName: string | undefined;
  PolicyDocument: string | undefined;
}
export interface PutRolePermissionsBoundaryRequest {
  RoleName: string | undefined;
  PermissionsBoundary: string | undefined;
}
export interface PutRolePolicyRequest {
  RoleName: string | undefined;
  PolicyName: string | undefined;
  PolicyDocument: string | undefined;
}
export interface PutUserPermissionsBoundaryRequest {
  UserName: string | undefined;
  PermissionsBoundary: string | undefined;
}
export interface PutUserPolicyRequest {
  UserName: string | undefined;
  PolicyName: string | undefined;
  PolicyDocument: string | undefined;
}
export interface RejectDelegationRequestRequest {
  DelegationRequestId: string | undefined;
  Notes?: string | undefined;
}
export interface RemoveClientIDFromOpenIDConnectProviderRequest {
  OpenIDConnectProviderArn: string | undefined;
  ClientID: string | undefined;
}
export interface RemoveRoleFromInstanceProfileRequest {
  InstanceProfileName: string | undefined;
  RoleName: string | undefined;
}
export interface RemoveUserFromGroupRequest {
  GroupName: string | undefined;
  UserName: string | undefined;
}
export interface ResetServiceSpecificCredentialRequest {
  UserName?: string | undefined;
  ServiceSpecificCredentialId: string | undefined;
}
export interface ResetServiceSpecificCredentialResponse {
  ServiceSpecificCredential?: ServiceSpecificCredential | undefined;
}
export interface ResyncMFADeviceRequest {
  UserName: string | undefined;
  SerialNumber: string | undefined;
  AuthenticationCode1: string | undefined;
  AuthenticationCode2: string | undefined;
}
export interface SendDelegationTokenRequest {
  DelegationRequestId: string | undefined;
}
export interface SetDefaultPolicyVersionRequest {
  PolicyArn: string | undefined;
  VersionId: string | undefined;
}
export interface SetSecurityTokenServicePreferencesRequest {
  GlobalEndpointTokenVersion: GlobalEndpointTokenVersion | undefined;
}
export interface ContextEntry {
  ContextKeyName?: string | undefined;
  ContextKeyValues?: string[] | undefined;
  ContextKeyType?: ContextKeyTypeEnum | undefined;
}
export interface SimulateCustomPolicyRequest {
  PolicyInputList: string[] | undefined;
  PermissionsBoundaryPolicyInputList?: string[] | undefined;
  ActionNames: string[] | undefined;
  ResourceArns?: string[] | undefined;
  ResourcePolicy?: string | undefined;
  ResourceOwner?: string | undefined;
  CallerArn?: string | undefined;
  ContextEntries?: ContextEntry[] | undefined;
  ResourceHandlingOption?: string | undefined;
  MaxItems?: number | undefined;
  Marker?: string | undefined;
}
export interface Position {
  Line?: number | undefined;
  Column?: number | undefined;
}
export interface Statement {
  SourcePolicyId?: string | undefined;
  SourcePolicyType?: PolicySourceType | undefined;
  StartPosition?: Position | undefined;
  EndPosition?: Position | undefined;
}
export interface OrganizationsDecisionDetail {
  AllowedByOrganizations?: boolean | undefined;
}
export interface PermissionsBoundaryDecisionDetail {
  AllowedByPermissionsBoundary?: boolean | undefined;
}
export interface ResourceSpecificResult {
  EvalResourceName: string | undefined;
  EvalResourceDecision: PolicyEvaluationDecisionType | undefined;
  MatchedStatements?: Statement[] | undefined;
  MissingContextValues?: string[] | undefined;
  EvalDecisionDetails?:
    | Record<string, PolicyEvaluationDecisionType>
    | undefined;
  PermissionsBoundaryDecisionDetail?:
    | PermissionsBoundaryDecisionDetail
    | undefined;
}
export interface EvaluationResult {
  EvalActionName: string | undefined;
  EvalResourceName?: string | undefined;
  EvalDecision: PolicyEvaluationDecisionType | undefined;
  MatchedStatements?: Statement[] | undefined;
  MissingContextValues?: string[] | undefined;
  OrganizationsDecisionDetail?: OrganizationsDecisionDetail | undefined;
  PermissionsBoundaryDecisionDetail?:
    | PermissionsBoundaryDecisionDetail
    | undefined;
  EvalDecisionDetails?:
    | Record<string, PolicyEvaluationDecisionType>
    | undefined;
  ResourceSpecificResults?: ResourceSpecificResult[] | undefined;
}
export interface SimulatePolicyResponse {
  EvaluationResults?: EvaluationResult[] | undefined;
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
}
export interface SimulatePrincipalPolicyRequest {
  PolicySourceArn: string | undefined;
  PolicyInputList?: string[] | undefined;
  PermissionsBoundaryPolicyInputList?: string[] | undefined;
  ActionNames: string[] | undefined;
  ResourceArns?: string[] | undefined;
  ResourcePolicy?: string | undefined;
  ResourceOwner?: string | undefined;
  CallerArn?: string | undefined;
  ContextEntries?: ContextEntry[] | undefined;
  ResourceHandlingOption?: string | undefined;
  MaxItems?: number | undefined;
  Marker?: string | undefined;
}
export interface TagInstanceProfileRequest {
  InstanceProfileName: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagMFADeviceRequest {
  SerialNumber: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagOpenIDConnectProviderRequest {
  OpenIDConnectProviderArn: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagPolicyRequest {
  PolicyArn: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagRoleRequest {
  RoleName: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagSAMLProviderRequest {
  SAMLProviderArn: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagServerCertificateRequest {
  ServerCertificateName: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagUserRequest {
  UserName: string | undefined;
  Tags: Tag[] | undefined;
}
export interface UntagInstanceProfileRequest {
  InstanceProfileName: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagMFADeviceRequest {
  SerialNumber: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagOpenIDConnectProviderRequest {
  OpenIDConnectProviderArn: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagPolicyRequest {
  PolicyArn: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagRoleRequest {
  RoleName: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagSAMLProviderRequest {
  SAMLProviderArn: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagServerCertificateRequest {
  ServerCertificateName: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagUserRequest {
  UserName: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UpdateAccessKeyRequest {
  UserName?: string | undefined;
  AccessKeyId: string | undefined;
  Status: StatusType | undefined;
}
export interface UpdateAccountPasswordPolicyRequest {
  MinimumPasswordLength?: number | undefined;
  RequireSymbols?: boolean | undefined;
  RequireNumbers?: boolean | undefined;
  RequireUppercaseCharacters?: boolean | undefined;
  RequireLowercaseCharacters?: boolean | undefined;
  AllowUsersToChangePassword?: boolean | undefined;
  MaxPasswordAge?: number | undefined;
  PasswordReusePrevention?: number | undefined;
  HardExpiry?: boolean | undefined;
}
export interface UpdateAssumeRolePolicyRequest {
  RoleName: string | undefined;
  PolicyDocument: string | undefined;
}
export interface UpdateDelegationRequestRequest {
  DelegationRequestId: string | undefined;
  Notes?: string | undefined;
}
export interface UpdateGroupRequest {
  GroupName: string | undefined;
  NewPath?: string | undefined;
  NewGroupName?: string | undefined;
}
export interface UpdateLoginProfileRequest {
  UserName: string | undefined;
  Password?: string | undefined;
  PasswordResetRequired?: boolean | undefined;
}
