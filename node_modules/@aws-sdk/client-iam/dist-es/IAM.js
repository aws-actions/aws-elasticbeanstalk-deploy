import { createAggregatedClient } from "@smithy/smithy-client";
import { AcceptDelegationRequestCommand, } from "./commands/AcceptDelegationRequestCommand";
import { AddClientIDToOpenIDConnectProviderCommand, } from "./commands/AddClientIDToOpenIDConnectProviderCommand";
import { AddRoleToInstanceProfileCommand, } from "./commands/AddRoleToInstanceProfileCommand";
import { AddUserToGroupCommand, } from "./commands/AddUserToGroupCommand";
import { AssociateDelegationRequestCommand, } from "./commands/AssociateDelegationRequestCommand";
import { AttachGroupPolicyCommand, } from "./commands/AttachGroupPolicyCommand";
import { AttachRolePolicyCommand, } from "./commands/AttachRolePolicyCommand";
import { AttachUserPolicyCommand, } from "./commands/AttachUserPolicyCommand";
import { ChangePasswordCommand, } from "./commands/ChangePasswordCommand";
import { CreateAccessKeyCommand, } from "./commands/CreateAccessKeyCommand";
import { CreateAccountAliasCommand, } from "./commands/CreateAccountAliasCommand";
import { CreateDelegationRequestCommand, } from "./commands/CreateDelegationRequestCommand";
import { CreateGroupCommand } from "./commands/CreateGroupCommand";
import { CreateInstanceProfileCommand, } from "./commands/CreateInstanceProfileCommand";
import { CreateLoginProfileCommand, } from "./commands/CreateLoginProfileCommand";
import { CreateOpenIDConnectProviderCommand, } from "./commands/CreateOpenIDConnectProviderCommand";
import { CreatePolicyCommand, } from "./commands/CreatePolicyCommand";
import { CreatePolicyVersionCommand, } from "./commands/CreatePolicyVersionCommand";
import { CreateRoleCommand } from "./commands/CreateRoleCommand";
import { CreateSAMLProviderCommand, } from "./commands/CreateSAMLProviderCommand";
import { CreateServiceLinkedRoleCommand, } from "./commands/CreateServiceLinkedRoleCommand";
import { CreateServiceSpecificCredentialCommand, } from "./commands/CreateServiceSpecificCredentialCommand";
import { CreateUserCommand } from "./commands/CreateUserCommand";
import { CreateVirtualMFADeviceCommand, } from "./commands/CreateVirtualMFADeviceCommand";
import { DeactivateMFADeviceCommand, } from "./commands/DeactivateMFADeviceCommand";
import { DeleteAccessKeyCommand, } from "./commands/DeleteAccessKeyCommand";
import { DeleteAccountAliasCommand, } from "./commands/DeleteAccountAliasCommand";
import { DeleteAccountPasswordPolicyCommand, } from "./commands/DeleteAccountPasswordPolicyCommand";
import { DeleteGroupCommand } from "./commands/DeleteGroupCommand";
import { DeleteGroupPolicyCommand, } from "./commands/DeleteGroupPolicyCommand";
import { DeleteInstanceProfileCommand, } from "./commands/DeleteInstanceProfileCommand";
import { DeleteLoginProfileCommand, } from "./commands/DeleteLoginProfileCommand";
import { DeleteOpenIDConnectProviderCommand, } from "./commands/DeleteOpenIDConnectProviderCommand";
import { DeletePolicyCommand, } from "./commands/DeletePolicyCommand";
import { DeletePolicyVersionCommand, } from "./commands/DeletePolicyVersionCommand";
import { DeleteRoleCommand } from "./commands/DeleteRoleCommand";
import { DeleteRolePermissionsBoundaryCommand, } from "./commands/DeleteRolePermissionsBoundaryCommand";
import { DeleteRolePolicyCommand, } from "./commands/DeleteRolePolicyCommand";
import { DeleteSAMLProviderCommand, } from "./commands/DeleteSAMLProviderCommand";
import { DeleteServerCertificateCommand, } from "./commands/DeleteServerCertificateCommand";
import { DeleteServiceLinkedRoleCommand, } from "./commands/DeleteServiceLinkedRoleCommand";
import { DeleteServiceSpecificCredentialCommand, } from "./commands/DeleteServiceSpecificCredentialCommand";
import { DeleteSigningCertificateCommand, } from "./commands/DeleteSigningCertificateCommand";
import { DeleteSSHPublicKeyCommand, } from "./commands/DeleteSSHPublicKeyCommand";
import { DeleteUserCommand } from "./commands/DeleteUserCommand";
import { DeleteUserPermissionsBoundaryCommand, } from "./commands/DeleteUserPermissionsBoundaryCommand";
import { DeleteUserPolicyCommand, } from "./commands/DeleteUserPolicyCommand";
import { DeleteVirtualMFADeviceCommand, } from "./commands/DeleteVirtualMFADeviceCommand";
import { DetachGroupPolicyCommand, } from "./commands/DetachGroupPolicyCommand";
import { DetachRolePolicyCommand, } from "./commands/DetachRolePolicyCommand";
import { DetachUserPolicyCommand, } from "./commands/DetachUserPolicyCommand";
import { DisableOrganizationsRootCredentialsManagementCommand, } from "./commands/DisableOrganizationsRootCredentialsManagementCommand";
import { DisableOrganizationsRootSessionsCommand, } from "./commands/DisableOrganizationsRootSessionsCommand";
import { DisableOutboundWebIdentityFederationCommand, } from "./commands/DisableOutboundWebIdentityFederationCommand";
import { EnableMFADeviceCommand, } from "./commands/EnableMFADeviceCommand";
import { EnableOrganizationsRootCredentialsManagementCommand, } from "./commands/EnableOrganizationsRootCredentialsManagementCommand";
import { EnableOrganizationsRootSessionsCommand, } from "./commands/EnableOrganizationsRootSessionsCommand";
import { EnableOutboundWebIdentityFederationCommand, } from "./commands/EnableOutboundWebIdentityFederationCommand";
import { GenerateCredentialReportCommand, } from "./commands/GenerateCredentialReportCommand";
import { GenerateOrganizationsAccessReportCommand, } from "./commands/GenerateOrganizationsAccessReportCommand";
import { GenerateServiceLastAccessedDetailsCommand, } from "./commands/GenerateServiceLastAccessedDetailsCommand";
import { GetAccessKeyLastUsedCommand, } from "./commands/GetAccessKeyLastUsedCommand";
import { GetAccountAuthorizationDetailsCommand, } from "./commands/GetAccountAuthorizationDetailsCommand";
import { GetAccountPasswordPolicyCommand, } from "./commands/GetAccountPasswordPolicyCommand";
import { GetAccountSummaryCommand, } from "./commands/GetAccountSummaryCommand";
import { GetContextKeysForCustomPolicyCommand, } from "./commands/GetContextKeysForCustomPolicyCommand";
import { GetContextKeysForPrincipalPolicyCommand, } from "./commands/GetContextKeysForPrincipalPolicyCommand";
import { GetCredentialReportCommand, } from "./commands/GetCredentialReportCommand";
import { GetDelegationRequestCommand, } from "./commands/GetDelegationRequestCommand";
import { GetGroupCommand } from "./commands/GetGroupCommand";
import { GetGroupPolicyCommand, } from "./commands/GetGroupPolicyCommand";
import { GetHumanReadableSummaryCommand, } from "./commands/GetHumanReadableSummaryCommand";
import { GetInstanceProfileCommand, } from "./commands/GetInstanceProfileCommand";
import { GetLoginProfileCommand, } from "./commands/GetLoginProfileCommand";
import { GetMFADeviceCommand, } from "./commands/GetMFADeviceCommand";
import { GetOpenIDConnectProviderCommand, } from "./commands/GetOpenIDConnectProviderCommand";
import { GetOrganizationsAccessReportCommand, } from "./commands/GetOrganizationsAccessReportCommand";
import { GetOutboundWebIdentityFederationInfoCommand, } from "./commands/GetOutboundWebIdentityFederationInfoCommand";
import { GetPolicyCommand } from "./commands/GetPolicyCommand";
import { GetPolicyVersionCommand, } from "./commands/GetPolicyVersionCommand";
import { GetRoleCommand } from "./commands/GetRoleCommand";
import { GetRolePolicyCommand, } from "./commands/GetRolePolicyCommand";
import { GetSAMLProviderCommand, } from "./commands/GetSAMLProviderCommand";
import { GetServerCertificateCommand, } from "./commands/GetServerCertificateCommand";
import { GetServiceLastAccessedDetailsCommand, } from "./commands/GetServiceLastAccessedDetailsCommand";
import { GetServiceLastAccessedDetailsWithEntitiesCommand, } from "./commands/GetServiceLastAccessedDetailsWithEntitiesCommand";
import { GetServiceLinkedRoleDeletionStatusCommand, } from "./commands/GetServiceLinkedRoleDeletionStatusCommand";
import { GetSSHPublicKeyCommand, } from "./commands/GetSSHPublicKeyCommand";
import { GetUserCommand } from "./commands/GetUserCommand";
import { GetUserPolicyCommand, } from "./commands/GetUserPolicyCommand";
import { ListAccessKeysCommand, } from "./commands/ListAccessKeysCommand";
import { ListAccountAliasesCommand, } from "./commands/ListAccountAliasesCommand";
import { ListAttachedGroupPoliciesCommand, } from "./commands/ListAttachedGroupPoliciesCommand";
import { ListAttachedRolePoliciesCommand, } from "./commands/ListAttachedRolePoliciesCommand";
import { ListAttachedUserPoliciesCommand, } from "./commands/ListAttachedUserPoliciesCommand";
import { ListDelegationRequestsCommand, } from "./commands/ListDelegationRequestsCommand";
import { ListEntitiesForPolicyCommand, } from "./commands/ListEntitiesForPolicyCommand";
import { ListGroupPoliciesCommand, } from "./commands/ListGroupPoliciesCommand";
import { ListGroupsCommand } from "./commands/ListGroupsCommand";
import { ListGroupsForUserCommand, } from "./commands/ListGroupsForUserCommand";
import { ListInstanceProfilesCommand, } from "./commands/ListInstanceProfilesCommand";
import { ListInstanceProfilesForRoleCommand, } from "./commands/ListInstanceProfilesForRoleCommand";
import { ListInstanceProfileTagsCommand, } from "./commands/ListInstanceProfileTagsCommand";
import { ListMFADevicesCommand, } from "./commands/ListMFADevicesCommand";
import { ListMFADeviceTagsCommand, } from "./commands/ListMFADeviceTagsCommand";
import { ListOpenIDConnectProvidersCommand, } from "./commands/ListOpenIDConnectProvidersCommand";
import { ListOpenIDConnectProviderTagsCommand, } from "./commands/ListOpenIDConnectProviderTagsCommand";
import { ListOrganizationsFeaturesCommand, } from "./commands/ListOrganizationsFeaturesCommand";
import { ListPoliciesCommand, } from "./commands/ListPoliciesCommand";
import { ListPoliciesGrantingServiceAccessCommand, } from "./commands/ListPoliciesGrantingServiceAccessCommand";
import { ListPolicyTagsCommand, } from "./commands/ListPolicyTagsCommand";
import { ListPolicyVersionsCommand, } from "./commands/ListPolicyVersionsCommand";
import { ListRolePoliciesCommand, } from "./commands/ListRolePoliciesCommand";
import { ListRolesCommand } from "./commands/ListRolesCommand";
import { ListRoleTagsCommand, } from "./commands/ListRoleTagsCommand";
import { ListSAMLProvidersCommand, } from "./commands/ListSAMLProvidersCommand";
import { ListSAMLProviderTagsCommand, } from "./commands/ListSAMLProviderTagsCommand";
import { ListServerCertificatesCommand, } from "./commands/ListServerCertificatesCommand";
import { ListServerCertificateTagsCommand, } from "./commands/ListServerCertificateTagsCommand";
import { ListServiceSpecificCredentialsCommand, } from "./commands/ListServiceSpecificCredentialsCommand";
import { ListSigningCertificatesCommand, } from "./commands/ListSigningCertificatesCommand";
import { ListSSHPublicKeysCommand, } from "./commands/ListSSHPublicKeysCommand";
import { ListUserPoliciesCommand, } from "./commands/ListUserPoliciesCommand";
import { ListUsersCommand } from "./commands/ListUsersCommand";
import { ListUserTagsCommand, } from "./commands/ListUserTagsCommand";
import { ListVirtualMFADevicesCommand, } from "./commands/ListVirtualMFADevicesCommand";
import { PutGroupPolicyCommand, } from "./commands/PutGroupPolicyCommand";
import { PutRolePermissionsBoundaryCommand, } from "./commands/PutRolePermissionsBoundaryCommand";
import { PutRolePolicyCommand, } from "./commands/PutRolePolicyCommand";
import { PutUserPermissionsBoundaryCommand, } from "./commands/PutUserPermissionsBoundaryCommand";
import { PutUserPolicyCommand, } from "./commands/PutUserPolicyCommand";
import { RejectDelegationRequestCommand, } from "./commands/RejectDelegationRequestCommand";
import { RemoveClientIDFromOpenIDConnectProviderCommand, } from "./commands/RemoveClientIDFromOpenIDConnectProviderCommand";
import { RemoveRoleFromInstanceProfileCommand, } from "./commands/RemoveRoleFromInstanceProfileCommand";
import { RemoveUserFromGroupCommand, } from "./commands/RemoveUserFromGroupCommand";
import { ResetServiceSpecificCredentialCommand, } from "./commands/ResetServiceSpecificCredentialCommand";
import { ResyncMFADeviceCommand, } from "./commands/ResyncMFADeviceCommand";
import { SendDelegationTokenCommand, } from "./commands/SendDelegationTokenCommand";
import { SetDefaultPolicyVersionCommand, } from "./commands/SetDefaultPolicyVersionCommand";
import { SetSecurityTokenServicePreferencesCommand, } from "./commands/SetSecurityTokenServicePreferencesCommand";
import { SimulateCustomPolicyCommand, } from "./commands/SimulateCustomPolicyCommand";
import { SimulatePrincipalPolicyCommand, } from "./commands/SimulatePrincipalPolicyCommand";
import { TagInstanceProfileCommand, } from "./commands/TagInstanceProfileCommand";
import { TagMFADeviceCommand, } from "./commands/TagMFADeviceCommand";
import { TagOpenIDConnectProviderCommand, } from "./commands/TagOpenIDConnectProviderCommand";
import { TagPolicyCommand } from "./commands/TagPolicyCommand";
import { TagRoleCommand } from "./commands/TagRoleCommand";
import { TagSAMLProviderCommand, } from "./commands/TagSAMLProviderCommand";
import { TagServerCertificateCommand, } from "./commands/TagServerCertificateCommand";
import { TagUserCommand } from "./commands/TagUserCommand";
import { UntagInstanceProfileCommand, } from "./commands/UntagInstanceProfileCommand";
import { UntagMFADeviceCommand, } from "./commands/UntagMFADeviceCommand";
import { UntagOpenIDConnectProviderCommand, } from "./commands/UntagOpenIDConnectProviderCommand";
import { UntagPolicyCommand } from "./commands/UntagPolicyCommand";
import { UntagRoleCommand } from "./commands/UntagRoleCommand";
import { UntagSAMLProviderCommand, } from "./commands/UntagSAMLProviderCommand";
import { UntagServerCertificateCommand, } from "./commands/UntagServerCertificateCommand";
import { UntagUserCommand } from "./commands/UntagUserCommand";
import { UpdateAccessKeyCommand, } from "./commands/UpdateAccessKeyCommand";
import { UpdateAccountPasswordPolicyCommand, } from "./commands/UpdateAccountPasswordPolicyCommand";
import { UpdateAssumeRolePolicyCommand, } from "./commands/UpdateAssumeRolePolicyCommand";
import { UpdateDelegationRequestCommand, } from "./commands/UpdateDelegationRequestCommand";
import { UpdateGroupCommand } from "./commands/UpdateGroupCommand";
import { UpdateLoginProfileCommand, } from "./commands/UpdateLoginProfileCommand";
import { UpdateOpenIDConnectProviderThumbprintCommand, } from "./commands/UpdateOpenIDConnectProviderThumbprintCommand";
import { UpdateRoleCommand } from "./commands/UpdateRoleCommand";
import { UpdateRoleDescriptionCommand, } from "./commands/UpdateRoleDescriptionCommand";
import { UpdateSAMLProviderCommand, } from "./commands/UpdateSAMLProviderCommand";
import { UpdateServerCertificateCommand, } from "./commands/UpdateServerCertificateCommand";
import { UpdateServiceSpecificCredentialCommand, } from "./commands/UpdateServiceSpecificCredentialCommand";
import { UpdateSigningCertificateCommand, } from "./commands/UpdateSigningCertificateCommand";
import { UpdateSSHPublicKeyCommand, } from "./commands/UpdateSSHPublicKeyCommand";
import { UpdateUserCommand } from "./commands/UpdateUserCommand";
import { UploadServerCertificateCommand, } from "./commands/UploadServerCertificateCommand";
import { UploadSigningCertificateCommand, } from "./commands/UploadSigningCertificateCommand";
import { UploadSSHPublicKeyCommand, } from "./commands/UploadSSHPublicKeyCommand";
import { IAMClient } from "./IAMClient";
import { paginateGetAccountAuthorizationDetails } from "./pagination/GetAccountAuthorizationDetailsPaginator";
import { paginateGetGroup } from "./pagination/GetGroupPaginator";
import { paginateListAccessKeys } from "./pagination/ListAccessKeysPaginator";
import { paginateListAccountAliases } from "./pagination/ListAccountAliasesPaginator";
import { paginateListAttachedGroupPolicies } from "./pagination/ListAttachedGroupPoliciesPaginator";
import { paginateListAttachedRolePolicies } from "./pagination/ListAttachedRolePoliciesPaginator";
import { paginateListAttachedUserPolicies } from "./pagination/ListAttachedUserPoliciesPaginator";
import { paginateListEntitiesForPolicy } from "./pagination/ListEntitiesForPolicyPaginator";
import { paginateListGroupPolicies } from "./pagination/ListGroupPoliciesPaginator";
import { paginateListGroupsForUser } from "./pagination/ListGroupsForUserPaginator";
import { paginateListGroups } from "./pagination/ListGroupsPaginator";
import { paginateListInstanceProfilesForRole } from "./pagination/ListInstanceProfilesForRolePaginator";
import { paginateListInstanceProfiles } from "./pagination/ListInstanceProfilesPaginator";
import { paginateListInstanceProfileTags } from "./pagination/ListInstanceProfileTagsPaginator";
import { paginateListMFADevices } from "./pagination/ListMFADevicesPaginator";
import { paginateListMFADeviceTags } from "./pagination/ListMFADeviceTagsPaginator";
import { paginateListOpenIDConnectProviderTags } from "./pagination/ListOpenIDConnectProviderTagsPaginator";
import { paginateListPolicies } from "./pagination/ListPoliciesPaginator";
import { paginateListPolicyTags } from "./pagination/ListPolicyTagsPaginator";
import { paginateListPolicyVersions } from "./pagination/ListPolicyVersionsPaginator";
import { paginateListRolePolicies } from "./pagination/ListRolePoliciesPaginator";
import { paginateListRoles } from "./pagination/ListRolesPaginator";
import { paginateListRoleTags } from "./pagination/ListRoleTagsPaginator";
import { paginateListSAMLProviderTags } from "./pagination/ListSAMLProviderTagsPaginator";
import { paginateListServerCertificates } from "./pagination/ListServerCertificatesPaginator";
import { paginateListServerCertificateTags } from "./pagination/ListServerCertificateTagsPaginator";
import { paginateListSigningCertificates } from "./pagination/ListSigningCertificatesPaginator";
import { paginateListSSHPublicKeys } from "./pagination/ListSSHPublicKeysPaginator";
import { paginateListUserPolicies } from "./pagination/ListUserPoliciesPaginator";
import { paginateListUsers } from "./pagination/ListUsersPaginator";
import { paginateListUserTags } from "./pagination/ListUserTagsPaginator";
import { paginateListVirtualMFADevices } from "./pagination/ListVirtualMFADevicesPaginator";
import { paginateSimulateCustomPolicy } from "./pagination/SimulateCustomPolicyPaginator";
import { paginateSimulatePrincipalPolicy } from "./pagination/SimulatePrincipalPolicyPaginator";
import { waitUntilInstanceProfileExists } from "./waiters/waitForInstanceProfileExists";
import { waitUntilPolicyExists } from "./waiters/waitForPolicyExists";
import { waitUntilRoleExists } from "./waiters/waitForRoleExists";
import { waitUntilUserExists } from "./waiters/waitForUserExists";
const commands = {
    AcceptDelegationRequestCommand,
    AddClientIDToOpenIDConnectProviderCommand,
    AddRoleToInstanceProfileCommand,
    AddUserToGroupCommand,
    AssociateDelegationRequestCommand,
    AttachGroupPolicyCommand,
    AttachRolePolicyCommand,
    AttachUserPolicyCommand,
    ChangePasswordCommand,
    CreateAccessKeyCommand,
    CreateAccountAliasCommand,
    CreateDelegationRequestCommand,
    CreateGroupCommand,
    CreateInstanceProfileCommand,
    CreateLoginProfileCommand,
    CreateOpenIDConnectProviderCommand,
    CreatePolicyCommand,
    CreatePolicyVersionCommand,
    CreateRoleCommand,
    CreateSAMLProviderCommand,
    CreateServiceLinkedRoleCommand,
    CreateServiceSpecificCredentialCommand,
    CreateUserCommand,
    CreateVirtualMFADeviceCommand,
    DeactivateMFADeviceCommand,
    DeleteAccessKeyCommand,
    DeleteAccountAliasCommand,
    DeleteAccountPasswordPolicyCommand,
    DeleteGroupCommand,
    DeleteGroupPolicyCommand,
    DeleteInstanceProfileCommand,
    DeleteLoginProfileCommand,
    DeleteOpenIDConnectProviderCommand,
    DeletePolicyCommand,
    DeletePolicyVersionCommand,
    DeleteRoleCommand,
    DeleteRolePermissionsBoundaryCommand,
    DeleteRolePolicyCommand,
    DeleteSAMLProviderCommand,
    DeleteServerCertificateCommand,
    DeleteServiceLinkedRoleCommand,
    DeleteServiceSpecificCredentialCommand,
    DeleteSigningCertificateCommand,
    DeleteSSHPublicKeyCommand,
    DeleteUserCommand,
    DeleteUserPermissionsBoundaryCommand,
    DeleteUserPolicyCommand,
    DeleteVirtualMFADeviceCommand,
    DetachGroupPolicyCommand,
    DetachRolePolicyCommand,
    DetachUserPolicyCommand,
    DisableOrganizationsRootCredentialsManagementCommand,
    DisableOrganizationsRootSessionsCommand,
    DisableOutboundWebIdentityFederationCommand,
    EnableMFADeviceCommand,
    EnableOrganizationsRootCredentialsManagementCommand,
    EnableOrganizationsRootSessionsCommand,
    EnableOutboundWebIdentityFederationCommand,
    GenerateCredentialReportCommand,
    GenerateOrganizationsAccessReportCommand,
    GenerateServiceLastAccessedDetailsCommand,
    GetAccessKeyLastUsedCommand,
    GetAccountAuthorizationDetailsCommand,
    GetAccountPasswordPolicyCommand,
    GetAccountSummaryCommand,
    GetContextKeysForCustomPolicyCommand,
    GetContextKeysForPrincipalPolicyCommand,
    GetCredentialReportCommand,
    GetDelegationRequestCommand,
    GetGroupCommand,
    GetGroupPolicyCommand,
    GetHumanReadableSummaryCommand,
    GetInstanceProfileCommand,
    GetLoginProfileCommand,
    GetMFADeviceCommand,
    GetOpenIDConnectProviderCommand,
    GetOrganizationsAccessReportCommand,
    GetOutboundWebIdentityFederationInfoCommand,
    GetPolicyCommand,
    GetPolicyVersionCommand,
    GetRoleCommand,
    GetRolePolicyCommand,
    GetSAMLProviderCommand,
    GetServerCertificateCommand,
    GetServiceLastAccessedDetailsCommand,
    GetServiceLastAccessedDetailsWithEntitiesCommand,
    GetServiceLinkedRoleDeletionStatusCommand,
    GetSSHPublicKeyCommand,
    GetUserCommand,
    GetUserPolicyCommand,
    ListAccessKeysCommand,
    ListAccountAliasesCommand,
    ListAttachedGroupPoliciesCommand,
    ListAttachedRolePoliciesCommand,
    ListAttachedUserPoliciesCommand,
    ListDelegationRequestsCommand,
    ListEntitiesForPolicyCommand,
    ListGroupPoliciesCommand,
    ListGroupsCommand,
    ListGroupsForUserCommand,
    ListInstanceProfilesCommand,
    ListInstanceProfilesForRoleCommand,
    ListInstanceProfileTagsCommand,
    ListMFADevicesCommand,
    ListMFADeviceTagsCommand,
    ListOpenIDConnectProvidersCommand,
    ListOpenIDConnectProviderTagsCommand,
    ListOrganizationsFeaturesCommand,
    ListPoliciesCommand,
    ListPoliciesGrantingServiceAccessCommand,
    ListPolicyTagsCommand,
    ListPolicyVersionsCommand,
    ListRolePoliciesCommand,
    ListRolesCommand,
    ListRoleTagsCommand,
    ListSAMLProvidersCommand,
    ListSAMLProviderTagsCommand,
    ListServerCertificatesCommand,
    ListServerCertificateTagsCommand,
    ListServiceSpecificCredentialsCommand,
    ListSigningCertificatesCommand,
    ListSSHPublicKeysCommand,
    ListUserPoliciesCommand,
    ListUsersCommand,
    ListUserTagsCommand,
    ListVirtualMFADevicesCommand,
    PutGroupPolicyCommand,
    PutRolePermissionsBoundaryCommand,
    PutRolePolicyCommand,
    PutUserPermissionsBoundaryCommand,
    PutUserPolicyCommand,
    RejectDelegationRequestCommand,
    RemoveClientIDFromOpenIDConnectProviderCommand,
    RemoveRoleFromInstanceProfileCommand,
    RemoveUserFromGroupCommand,
    ResetServiceSpecificCredentialCommand,
    ResyncMFADeviceCommand,
    SendDelegationTokenCommand,
    SetDefaultPolicyVersionCommand,
    SetSecurityTokenServicePreferencesCommand,
    SimulateCustomPolicyCommand,
    SimulatePrincipalPolicyCommand,
    TagInstanceProfileCommand,
    TagMFADeviceCommand,
    TagOpenIDConnectProviderCommand,
    TagPolicyCommand,
    TagRoleCommand,
    TagSAMLProviderCommand,
    TagServerCertificateCommand,
    TagUserCommand,
    UntagInstanceProfileCommand,
    UntagMFADeviceCommand,
    UntagOpenIDConnectProviderCommand,
    UntagPolicyCommand,
    UntagRoleCommand,
    UntagSAMLProviderCommand,
    UntagServerCertificateCommand,
    UntagUserCommand,
    UpdateAccessKeyCommand,
    UpdateAccountPasswordPolicyCommand,
    UpdateAssumeRolePolicyCommand,
    UpdateDelegationRequestCommand,
    UpdateGroupCommand,
    UpdateLoginProfileCommand,
    UpdateOpenIDConnectProviderThumbprintCommand,
    UpdateRoleCommand,
    UpdateRoleDescriptionCommand,
    UpdateSAMLProviderCommand,
    UpdateServerCertificateCommand,
    UpdateServiceSpecificCredentialCommand,
    UpdateSigningCertificateCommand,
    UpdateSSHPublicKeyCommand,
    UpdateUserCommand,
    UploadServerCertificateCommand,
    UploadSigningCertificateCommand,
    UploadSSHPublicKeyCommand,
};
const paginators = {
    paginateGetAccountAuthorizationDetails,
    paginateGetGroup,
    paginateListAccessKeys,
    paginateListAccountAliases,
    paginateListAttachedGroupPolicies,
    paginateListAttachedRolePolicies,
    paginateListAttachedUserPolicies,
    paginateListEntitiesForPolicy,
    paginateListGroupPolicies,
    paginateListGroups,
    paginateListGroupsForUser,
    paginateListInstanceProfiles,
    paginateListInstanceProfilesForRole,
    paginateListInstanceProfileTags,
    paginateListMFADevices,
    paginateListMFADeviceTags,
    paginateListOpenIDConnectProviderTags,
    paginateListPolicies,
    paginateListPolicyTags,
    paginateListPolicyVersions,
    paginateListRolePolicies,
    paginateListRoles,
    paginateListRoleTags,
    paginateListSAMLProviderTags,
    paginateListServerCertificates,
    paginateListServerCertificateTags,
    paginateListSigningCertificates,
    paginateListSSHPublicKeys,
    paginateListUserPolicies,
    paginateListUsers,
    paginateListUserTags,
    paginateListVirtualMFADevices,
    paginateSimulateCustomPolicy,
    paginateSimulatePrincipalPolicy,
};
const waiters = {
    waitUntilInstanceProfileExists,
    waitUntilPolicyExists,
    waitUntilRoleExists,
    waitUntilUserExists,
};
export class IAM extends IAMClient {
}
createAggregatedClient(commands, IAM, { paginators, waiters });
