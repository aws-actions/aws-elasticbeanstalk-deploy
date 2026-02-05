'use strict';

var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var schema = require('@smithy/core/schema');
var middlewareContentLength = require('@smithy/middleware-content-length');
var middlewareEndpoint = require('@smithy/middleware-endpoint');
var middlewareRetry = require('@smithy/middleware-retry');
var smithyClient = require('@smithy/smithy-client');
var httpAuthSchemeProvider = require('./auth/httpAuthSchemeProvider');
var runtimeConfig = require('./runtimeConfig');
var regionConfigResolver = require('@aws-sdk/region-config-resolver');
var protocolHttp = require('@smithy/protocol-http');
var utilWaiter = require('@smithy/util-waiter');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "iam",
    });
};
const commonParams = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
};

const getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
    let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
    let _credentials = runtimeConfig.credentials;
    return {
        setHttpAuthScheme(httpAuthScheme) {
            const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
            if (index === -1) {
                _httpAuthSchemes.push(httpAuthScheme);
            }
            else {
                _httpAuthSchemes.splice(index, 1, httpAuthScheme);
            }
        },
        httpAuthSchemes() {
            return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
            _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
            return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
            _credentials = credentials;
        },
        credentials() {
            return _credentials;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig), smithyClient.getDefaultExtensionConfiguration(runtimeConfig), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class IAMClient extends smithyClient.Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = runtimeConfig.getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = middlewareUserAgent.resolveUserAgentConfig(_config_1);
        const _config_3 = middlewareRetry.resolveRetryConfig(_config_2);
        const _config_4 = configResolver.resolveRegionConfig(_config_3);
        const _config_5 = middlewareHostHeader.resolveHostHeaderConfig(_config_4);
        const _config_6 = middlewareEndpoint.resolveEndpointConfig(_config_5);
        const _config_7 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultIAMHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class IAMServiceException extends smithyClient.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, IAMServiceException.prototype);
    }
}

class ConcurrentModificationException extends IAMServiceException {
    name = "ConcurrentModificationException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ConcurrentModificationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConcurrentModificationException.prototype);
    }
}
class NoSuchEntityException extends IAMServiceException {
    name = "NoSuchEntityException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "NoSuchEntityException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, NoSuchEntityException.prototype);
    }
}
class ServiceFailureException extends IAMServiceException {
    name = "ServiceFailureException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "ServiceFailureException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceFailureException.prototype);
    }
}
class AccountNotManagementOrDelegatedAdministratorException extends IAMServiceException {
    name = "AccountNotManagementOrDelegatedAdministratorException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "AccountNotManagementOrDelegatedAdministratorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccountNotManagementOrDelegatedAdministratorException.prototype);
        this.Message = opts.Message;
    }
}
class InvalidInputException extends IAMServiceException {
    name = "InvalidInputException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidInputException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidInputException.prototype);
    }
}
class LimitExceededException extends IAMServiceException {
    name = "LimitExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "LimitExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, LimitExceededException.prototype);
    }
}
class EntityAlreadyExistsException extends IAMServiceException {
    name = "EntityAlreadyExistsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "EntityAlreadyExistsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, EntityAlreadyExistsException.prototype);
    }
}
class UnmodifiableEntityException extends IAMServiceException {
    name = "UnmodifiableEntityException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "UnmodifiableEntityException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnmodifiableEntityException.prototype);
    }
}
class PolicyNotAttachableException extends IAMServiceException {
    name = "PolicyNotAttachableException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "PolicyNotAttachableException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, PolicyNotAttachableException.prototype);
    }
}
class EntityTemporarilyUnmodifiableException extends IAMServiceException {
    name = "EntityTemporarilyUnmodifiableException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "EntityTemporarilyUnmodifiableException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, EntityTemporarilyUnmodifiableException.prototype);
    }
}
class InvalidUserTypeException extends IAMServiceException {
    name = "InvalidUserTypeException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidUserTypeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidUserTypeException.prototype);
    }
}
class PasswordPolicyViolationException extends IAMServiceException {
    name = "PasswordPolicyViolationException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "PasswordPolicyViolationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, PasswordPolicyViolationException.prototype);
    }
}
class OpenIdIdpCommunicationErrorException extends IAMServiceException {
    name = "OpenIdIdpCommunicationErrorException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "OpenIdIdpCommunicationErrorException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, OpenIdIdpCommunicationErrorException.prototype);
    }
}
class MalformedPolicyDocumentException extends IAMServiceException {
    name = "MalformedPolicyDocumentException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "MalformedPolicyDocumentException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MalformedPolicyDocumentException.prototype);
    }
}
class ServiceNotSupportedException extends IAMServiceException {
    name = "ServiceNotSupportedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ServiceNotSupportedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceNotSupportedException.prototype);
    }
}
class DeleteConflictException extends IAMServiceException {
    name = "DeleteConflictException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "DeleteConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DeleteConflictException.prototype);
    }
}
class OrganizationNotFoundException extends IAMServiceException {
    name = "OrganizationNotFoundException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "OrganizationNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, OrganizationNotFoundException.prototype);
        this.Message = opts.Message;
    }
}
class OrganizationNotInAllFeaturesModeException extends IAMServiceException {
    name = "OrganizationNotInAllFeaturesModeException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "OrganizationNotInAllFeaturesModeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, OrganizationNotInAllFeaturesModeException.prototype);
        this.Message = opts.Message;
    }
}
class ServiceAccessNotEnabledException extends IAMServiceException {
    name = "ServiceAccessNotEnabledException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ServiceAccessNotEnabledException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceAccessNotEnabledException.prototype);
        this.Message = opts.Message;
    }
}
class FeatureDisabledException extends IAMServiceException {
    name = "FeatureDisabledException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "FeatureDisabledException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, FeatureDisabledException.prototype);
    }
}
class InvalidAuthenticationCodeException extends IAMServiceException {
    name = "InvalidAuthenticationCodeException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidAuthenticationCodeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidAuthenticationCodeException.prototype);
    }
}
class CallerIsNotManagementAccountException extends IAMServiceException {
    name = "CallerIsNotManagementAccountException";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "CallerIsNotManagementAccountException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, CallerIsNotManagementAccountException.prototype);
        this.Message = opts.Message;
    }
}
class FeatureEnabledException extends IAMServiceException {
    name = "FeatureEnabledException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "FeatureEnabledException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, FeatureEnabledException.prototype);
    }
}
class ReportGenerationLimitExceededException extends IAMServiceException {
    name = "ReportGenerationLimitExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ReportGenerationLimitExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ReportGenerationLimitExceededException.prototype);
    }
}
class CredentialReportExpiredException extends IAMServiceException {
    name = "CredentialReportExpiredException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "CredentialReportExpiredException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, CredentialReportExpiredException.prototype);
    }
}
class CredentialReportNotPresentException extends IAMServiceException {
    name = "CredentialReportNotPresentException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "CredentialReportNotPresentException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, CredentialReportNotPresentException.prototype);
    }
}
class CredentialReportNotReadyException extends IAMServiceException {
    name = "CredentialReportNotReadyException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "CredentialReportNotReadyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, CredentialReportNotReadyException.prototype);
    }
}
class UnrecognizedPublicKeyEncodingException extends IAMServiceException {
    name = "UnrecognizedPublicKeyEncodingException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "UnrecognizedPublicKeyEncodingException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnrecognizedPublicKeyEncodingException.prototype);
    }
}
class PolicyEvaluationException extends IAMServiceException {
    name = "PolicyEvaluationException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "PolicyEvaluationException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, PolicyEvaluationException.prototype);
    }
}
class KeyPairMismatchException extends IAMServiceException {
    name = "KeyPairMismatchException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "KeyPairMismatchException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, KeyPairMismatchException.prototype);
    }
}
class MalformedCertificateException extends IAMServiceException {
    name = "MalformedCertificateException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "MalformedCertificateException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MalformedCertificateException.prototype);
    }
}
class DuplicateCertificateException extends IAMServiceException {
    name = "DuplicateCertificateException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "DuplicateCertificateException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DuplicateCertificateException.prototype);
    }
}
class InvalidCertificateException extends IAMServiceException {
    name = "InvalidCertificateException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidCertificateException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidCertificateException.prototype);
    }
}
class DuplicateSSHPublicKeyException extends IAMServiceException {
    name = "DuplicateSSHPublicKeyException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "DuplicateSSHPublicKeyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DuplicateSSHPublicKeyException.prototype);
    }
}
class InvalidPublicKeyException extends IAMServiceException {
    name = "InvalidPublicKeyException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidPublicKeyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidPublicKeyException.prototype);
    }
}

const _A = "Arn";
const _AA = "AccountAlias";
const _AAc = "AccountAliases";
const _ABO = "AllowedByOrganizations";
const _ABPB = "AllowedByPermissionsBoundary";
const _AC = "AuthenticationCode1";
const _ACIDTOIDCP = "AddClientIDToOpenIDConnectProvider";
const _ACIDTOIDCPR = "AddClientIDToOpenIDConnectProviderRequest";
const _ACt = "AttachmentCount";
const _ACu = "AuthenticationCode2";
const _AD = "AccessDetail";
const _ADR = "AcceptDelegationRequest";
const _ADRR = "AcceptDelegationRequestRequest";
const _ADRRs = "AssociateDelegationRequestRequest";
const _ADRs = "AssociateDelegationRequest";
const _ADc = "AccessDetails";
const _AEM = "AssertionEncryptionMode";
const _AGP = "AttachGroupPolicy";
const _AGPR = "AttachGroupPolicyRequest";
const _AI = "ApproverId";
const _AK = "AccessKey";
const _AKI = "AccessKeyId";
const _AKLU = "AccessKeyLastUsed";
const _AKM = "AccessKeyMetadata";
const _AMP = "AttachedManagedPolicies";
const _AN = "ActionNames";
const _ANMODAE = "AccountNotManagementOrDelegatedAdministratorException";
const _ANc = "ActionName";
const _AP = "AttachedPolicy";
const _APB = "AttachedPermissionsBoundary";
const _APK = "AddPrivateKey";
const _APt = "AttachedPolicies";
const _ARP = "AttachRolePolicy";
const _ARPD = "AssumeRolePolicyDocument";
const _ARPR = "AttachRolePolicyRequest";
const _ARTIP = "AddRoleToInstanceProfile";
const _ARTIPR = "AddRoleToInstanceProfileRequest";
const _AS = "AssignmentStatus";
const _AU = "AllUsers";
const _AUP = "AttachUserPolicy";
const _AUPR = "AttachUserPolicyRequest";
const _AUTCP = "AllowUsersToChangePassword";
const _AUTG = "AddUserToGroup";
const _AUTGR = "AddUserToGroupRequest";
const _AWSSN = "AWSServiceName";
const _BD = "BootstrapDatum";
const _BSS = "Base32StringSeed";
const _C = "Code";
const _CA = "CallerArn";
const _CAA = "CreateAccountAlias";
const _CAAR = "CreateAccountAliasRequest";
const _CAD = "CredentialAgeDays";
const _CAK = "CreateAccessKey";
const _CAKR = "CreateAccessKeyRequest";
const _CAKRr = "CreateAccessKeyResponse";
const _CB = "CertificateBody";
const _CC = "CertificateChain";
const _CD = "CreateDate";
const _CDL = "ConsoleDeepLink";
const _CDR = "CreateDelegationRequest";
const _CDRR = "CreateDelegationRequestRequest";
const _CDRRr = "CreateDelegationRequestResponse";
const _CE = "ContextEntry";
const _CELT = "ContextEntryListType";
const _CEo = "ContextEntries";
const _CG = "CreateGroup";
const _CGR = "CreateGroupRequest";
const _CGRr = "CreateGroupResponse";
const _CI = "CertificateId";
const _CID = "ClientID";
const _CIDL = "ClientIDList";
const _CINMAE = "CallerIsNotManagementAccountException";
const _CIP = "CreateInstanceProfile";
const _CIPR = "CreateInstanceProfileRequest";
const _CIPRr = "CreateInstanceProfileResponse";
const _CKN = "ContextKeyName";
const _CKNo = "ContextKeyNames";
const _CKT = "ContextKeyType";
const _CKV = "ContextKeyValues";
const _CLP = "CreateLoginProfile";
const _CLPR = "CreateLoginProfileRequest";
const _CLPRr = "CreateLoginProfileResponse";
const _CME = "ConcurrentModificationException";
const _COIDCP = "CreateOpenIDConnectProvider";
const _COIDCPR = "CreateOpenIDConnectProviderRequest";
const _COIDCPRr = "CreateOpenIDConnectProviderResponse";
const _CP = "ChangePassword";
const _CPR = "ChangePasswordRequest";
const _CPRr = "CreatePolicyRequest";
const _CPRre = "CreatePolicyResponse";
const _CPV = "CreatePolicyVersion";
const _CPVR = "CreatePolicyVersionRequest";
const _CPVRr = "CreatePolicyVersionResponse";
const _CPr = "CreatePolicy";
const _CR = "CreateRole";
const _CREE = "CredentialReportExpiredException";
const _CRNPE = "CredentialReportNotPresentException";
const _CRNRE = "CredentialReportNotReadyException";
const _CRR = "CreateRoleRequest";
const _CRRr = "CreateRoleResponse";
const _CS = "CustomSuffix";
const _CSAMLP = "CreateSAMLProvider";
const _CSAMLPR = "CreateSAMLProviderRequest";
const _CSAMLPRr = "CreateSAMLProviderResponse";
const _CSLR = "CreateServiceLinkedRole";
const _CSLRR = "CreateServiceLinkedRoleRequest";
const _CSLRRr = "CreateServiceLinkedRoleResponse";
const _CSSC = "CreateServiceSpecificCredential";
const _CSSCR = "CreateServiceSpecificCredentialRequest";
const _CSSCRr = "CreateServiceSpecificCredentialResponse";
const _CU = "CreateUser";
const _CUR = "CreateUserRequest";
const _CURr = "CreateUserResponse";
const _CVMFAD = "CreateVirtualMFADevice";
const _CVMFADR = "CreateVirtualMFADeviceRequest";
const _CVMFADRr = "CreateVirtualMFADeviceResponse";
const _Ce = "Certifications";
const _Cer = "Certificates";
const _Cert = "Certificate";
const _Co = "Content";
const _Col = "Column";
const _D = "Description";
const _DAA = "DeleteAccountAlias";
const _DAAR = "DeleteAccountAliasRequest";
const _DAK = "DeleteAccessKey";
const _DAKR = "DeleteAccessKeyRequest";
const _DAPP = "DeleteAccountPasswordPolicy";
const _DCE = "DeleteConflictException";
const _DCEu = "DuplicateCertificateException";
const _DG = "DeleteGroup";
const _DGP = "DeleteGroupPolicy";
const _DGPR = "DeleteGroupPolicyRequest";
const _DGPRe = "DetachGroupPolicyRequest";
const _DGPe = "DetachGroupPolicy";
const _DGR = "DeleteGroupRequest";
const _DIP = "DeleteInstanceProfile";
const _DIPR = "DeleteInstanceProfileRequest";
const _DLP = "DeleteLoginProfile";
const _DLPR = "DeleteLoginProfileRequest";
const _DMFAD = "DeactivateMFADevice";
const _DMFADR = "DeactivateMFADeviceRequest";
const _DOIDCP = "DeleteOpenIDConnectProvider";
const _DOIDCPR = "DeleteOpenIDConnectProviderRequest";
const _DORCM = "DisableOrganizationsRootCredentialsManagement";
const _DORCMR = "DisableOrganizationsRootCredentialsManagementRequest";
const _DORCMRi = "DisableOrganizationsRootCredentialsManagementResponse";
const _DORS = "DisableOrganizationsRootSessions";
const _DORSR = "DisableOrganizationsRootSessionsRequest";
const _DORSRi = "DisableOrganizationsRootSessionsResponse";
const _DOWIF = "DisableOutboundWebIdentityFederation";
const _DP = "DelegationPermission";
const _DPC = "DelegationPermissionCheck";
const _DPR = "DeletePolicyRequest";
const _DPV = "DeletePolicyVersion";
const _DPVR = "DeletePolicyVersionRequest";
const _DPe = "DeletePolicy";
const _DR = "DelegationRequest";
const _DRI = "DelegationRequestId";
const _DRP = "DeleteRolePolicy";
const _DRPB = "DeleteRolePermissionsBoundary";
const _DRPBR = "DeleteRolePermissionsBoundaryRequest";
const _DRPR = "DeleteRolePolicyRequest";
const _DRPRe = "DetachRolePolicyRequest";
const _DRPe = "DetachRolePolicy";
const _DRR = "DeleteRoleRequest";
const _DRe = "DelegationRequests";
const _DRel = "DeleteRole";
const _DSAMLP = "DeleteSAMLProvider";
const _DSAMLPR = "DeleteSAMLProviderRequest";
const _DSC = "DeleteServerCertificate";
const _DSCR = "DeleteServerCertificateRequest";
const _DSCRe = "DeleteSigningCertificateRequest";
const _DSCe = "DeleteSigningCertificate";
const _DSLR = "DeleteServiceLinkedRole";
const _DSLRR = "DeleteServiceLinkedRoleRequest";
const _DSLRRe = "DeleteServiceLinkedRoleResponse";
const _DSSC = "DeleteServiceSpecificCredential";
const _DSSCR = "DeleteServiceSpecificCredentialRequest";
const _DSSHPK = "DeleteSSHPublicKey";
const _DSSHPKE = "DuplicateSSHPublicKeyException";
const _DSSHPKR = "DeleteSSHPublicKeyRequest";
const _DTFRT = "DeletionTaskFailureReasonType";
const _DTI = "DeletionTaskId";
const _DU = "DeleteUser";
const _DUP = "DeleteUserPolicy";
const _DUPB = "DeleteUserPermissionsBoundary";
const _DUPBR = "DeleteUserPermissionsBoundaryRequest";
const _DUPR = "DeleteUserPolicyRequest";
const _DUPRe = "DetachUserPolicyRequest";
const _DUPe = "DetachUserPolicy";
const _DUR = "DeleteUserRequest";
const _DVI = "DefaultVersionId";
const _DVMFAD = "DeleteVirtualMFADevice";
const _DVMFADR = "DeleteVirtualMFADeviceRequest";
const _Do = "Document";
const _E = "Error";
const _EA = "EntityArn";
const _EAEE = "EntityAlreadyExistsException";
const _EAN = "EvalActionName";
const _ED = "EntityDetails";
const _EDD = "EvalDecisionDetails";
const _EDL = "EntityDetailsList";
const _EDn = "EnableDate";
const _EDr = "ErrorDetails";
const _EDv = "EvalDecision";
const _EDx = "ExpirationDate";
const _EF = "EnabledFeatures";
const _EFn = "EntityFilter";
const _EI = "EntityInfo";
const _EMFAD = "EnableMFADevice";
const _EMFADR = "EnableMFADeviceRequest";
const _EN = "EntityName";
const _EORCM = "EnableOrganizationsRootCredentialsManagement";
const _EORCMR = "EnableOrganizationsRootCredentialsManagementRequest";
const _EORCMRn = "EnableOrganizationsRootCredentialsManagementResponse";
const _EORS = "EnableOrganizationsRootSessions";
const _EORSR = "EnableOrganizationsRootSessionsRequest";
const _EORSRn = "EnableOrganizationsRootSessionsResponse";
const _EOWIF = "EnableOutboundWebIdentityFederation";
const _EOWIFR = "EnableOutboundWebIdentityFederationResponse";
const _EP = "EntityPath";
const _EPn = "EndPosition";
const _EPx = "ExpirePasswords";
const _ER = "EvaluationResult";
const _ERD = "EvalResourceDecision";
const _ERLT = "EvaluationResultsListType";
const _ERN = "EvalResourceName";
const _ERv = "EvaluationResults";
const _ET = "ExpirationTime";
const _ETUE = "EntityTemporarilyUnmodifiableException";
const _ETn = "EntityType";
const _En = "Encoding";
const _Ex = "Expiration";
const _F = "Filter";
const _FDE = "FeatureDisabledException";
const _FEE = "FeatureEnabledException";
const _Fi = "Fingerprint";
const _G = "Group";
const _GAAD = "GetAccountAuthorizationDetails";
const _GAADR = "GetAccountAuthorizationDetailsRequest";
const _GAADRe = "GetAccountAuthorizationDetailsResponse";
const _GAKLU = "GetAccessKeyLastUsed";
const _GAKLUR = "GetAccessKeyLastUsedRequest";
const _GAKLURe = "GetAccessKeyLastUsedResponse";
const _GAPP = "GetAccountPasswordPolicy";
const _GAPPR = "GetAccountPasswordPolicyResponse";
const _GAS = "GetAccountSummary";
const _GASR = "GetAccountSummaryResponse";
const _GCKFCP = "GetContextKeysForCustomPolicy";
const _GCKFCPR = "GetContextKeysForCustomPolicyRequest";
const _GCKFPP = "GetContextKeysForPrincipalPolicy";
const _GCKFPPR = "GetContextKeysForPrincipalPolicyRequest";
const _GCKFPR = "GetContextKeysForPolicyResponse";
const _GCR = "GenerateCredentialReport";
const _GCRR = "GenerateCredentialReportResponse";
const _GCRRe = "GetCredentialReportResponse";
const _GCRe = "GetCredentialReport";
const _GD = "GroupDetail";
const _GDL = "GroupDetailList";
const _GDR = "GetDelegationRequest";
const _GDRR = "GetDelegationRequestRequest";
const _GDRRe = "GetDelegationRequestResponse";
const _GETV = "GlobalEndpointTokenVersion";
const _GG = "GetGroup";
const _GGP = "GetGroupPolicy";
const _GGPR = "GetGroupPolicyRequest";
const _GGPRe = "GetGroupPolicyResponse";
const _GGR = "GetGroupRequest";
const _GGRe = "GetGroupResponse";
const _GHRS = "GetHumanReadableSummary";
const _GHRSR = "GetHumanReadableSummaryRequest";
const _GHRSRe = "GetHumanReadableSummaryResponse";
const _GI = "GroupId";
const _GIP = "GetInstanceProfile";
const _GIPR = "GetInstanceProfileRequest";
const _GIPRe = "GetInstanceProfileResponse";
const _GL = "GroupList";
const _GLP = "GetLoginProfile";
const _GLPR = "GetLoginProfileRequest";
const _GLPRe = "GetLoginProfileResponse";
const _GMFAD = "GetMFADevice";
const _GMFADR = "GetMFADeviceRequest";
const _GMFADRe = "GetMFADeviceResponse";
const _GN = "GroupName";
const _GOAR = "GenerateOrganizationsAccessReport";
const _GOARR = "GenerateOrganizationsAccessReportRequest";
const _GOARRe = "GenerateOrganizationsAccessReportResponse";
const _GOARRet = "GetOrganizationsAccessReportRequest";
const _GOARRetr = "GetOrganizationsAccessReportResponse";
const _GOARe = "GetOrganizationsAccessReport";
const _GOIDCP = "GetOpenIDConnectProvider";
const _GOIDCPR = "GetOpenIDConnectProviderRequest";
const _GOIDCPRe = "GetOpenIDConnectProviderResponse";
const _GOWIFI = "GetOutboundWebIdentityFederationInfo";
const _GOWIFIR = "GetOutboundWebIdentityFederationInfoResponse";
const _GP = "GetPolicy";
const _GPL = "GroupPolicyList";
const _GPR = "GetPolicyRequest";
const _GPRe = "GetPolicyResponse";
const _GPV = "GetPolicyVersion";
const _GPVR = "GetPolicyVersionRequest";
const _GPVRe = "GetPolicyVersionResponse";
const _GR = "GetRole";
const _GRP = "GetRolePolicy";
const _GRPR = "GetRolePolicyRequest";
const _GRPRe = "GetRolePolicyResponse";
const _GRR = "GetRoleRequest";
const _GRRe = "GetRoleResponse";
const _GSAMLP = "GetSAMLProvider";
const _GSAMLPR = "GetSAMLProviderRequest";
const _GSAMLPRe = "GetSAMLProviderResponse";
const _GSC = "GetServerCertificate";
const _GSCR = "GetServerCertificateRequest";
const _GSCRe = "GetServerCertificateResponse";
const _GSLAD = "GenerateServiceLastAccessedDetails";
const _GSLADR = "GenerateServiceLastAccessedDetailsRequest";
const _GSLADRe = "GenerateServiceLastAccessedDetailsResponse";
const _GSLADRet = "GetServiceLastAccessedDetailsRequest";
const _GSLADRete = "GetServiceLastAccessedDetailsResponse";
const _GSLADWE = "GetServiceLastAccessedDetailsWithEntities";
const _GSLADWER = "GetServiceLastAccessedDetailsWithEntitiesRequest";
const _GSLADWERe = "GetServiceLastAccessedDetailsWithEntitiesResponse";
const _GSLADe = "GetServiceLastAccessedDetails";
const _GSLRDS = "GetServiceLinkedRoleDeletionStatus";
const _GSLRDSR = "GetServiceLinkedRoleDeletionStatusRequest";
const _GSLRDSRe = "GetServiceLinkedRoleDeletionStatusResponse";
const _GSSHPK = "GetSSHPublicKey";
const _GSSHPKR = "GetSSHPublicKeyRequest";
const _GSSHPKRe = "GetSSHPublicKeyResponse";
const _GT = "GeneratedTime";
const _GU = "GetUser";
const _GUP = "GetUserPolicy";
const _GUPR = "GetUserPolicyRequest";
const _GUPRe = "GetUserPolicyResponse";
const _GUR = "GetUserRequest";
const _GURe = "GetUserResponse";
const _Gr = "Granularity";
const _Gro = "Groups";
const _HE = "HardExpiry";
const _I = "Id";
const _IA = "IsAttachable";
const _IACE = "InvalidAuthenticationCodeException";
const _ICE = "InvalidCertificateException";
const _IDV = "IsDefaultVersion";
const _II = "IssuerIdentifier";
const _IIE = "InvalidInputException";
const _IP = "InstanceProfile";
const _IPI = "InstanceProfileId";
const _IPKE = "InvalidPublicKeyException";
const _IPL = "InstanceProfileList";
const _IPN = "InstanceProfileName";
const _IPn = "InstanceProfiles";
const _IT = "IsTruncated";
const _IUTE = "InvalidUserTypeException";
const _JCD = "JobCreationDate";
const _JCDo = "JobCompletionDate";
const _JI = "JobId";
const _JS = "JobStatus";
const _JT = "JobType";
const _JVE = "JwtVendingEnabled";
const _K = "Key";
const _KI = "KeyId";
const _KPME = "KeyPairMismatchException";
const _L = "Locale";
const _LA = "LastAuthenticated";
const _LAA = "ListAccountAliases";
const _LAAR = "ListAccountAliasesRequest";
const _LAARi = "ListAccountAliasesResponse";
const _LAE = "LastAuthenticatedEntity";
const _LAEa = "LastAccessedEntity";
const _LAGP = "ListAttachedGroupPolicies";
const _LAGPR = "ListAttachedGroupPoliciesRequest";
const _LAGPRi = "ListAttachedGroupPoliciesResponse";
const _LAK = "ListAccessKeys";
const _LAKR = "ListAccessKeysRequest";
const _LAKRi = "ListAccessKeysResponse";
const _LAR = "LastAuthenticatedRegion";
const _LARP = "ListAttachedRolePolicies";
const _LARPR = "ListAttachedRolePoliciesRequest";
const _LARPRi = "ListAttachedRolePoliciesResponse";
const _LARa = "LastAccessedRegion";
const _LAT = "LastAuthenticatedTime";
const _LATa = "LastAccessedTime";
const _LAUP = "ListAttachedUserPolicies";
const _LAUPR = "ListAttachedUserPoliciesRequest";
const _LAUPRi = "ListAttachedUserPoliciesResponse";
const _LDR = "ListDelegationRequests";
const _LDRR = "ListDelegationRequestsRequest";
const _LDRRi = "ListDelegationRequestsResponse";
const _LEE = "LimitExceededException";
const _LEFP = "ListEntitiesForPolicy";
const _LEFPR = "ListEntitiesForPolicyRequest";
const _LEFPRi = "ListEntitiesForPolicyResponse";
const _LG = "ListGroups";
const _LGFU = "ListGroupsForUser";
const _LGFUR = "ListGroupsForUserRequest";
const _LGFURi = "ListGroupsForUserResponse";
const _LGP = "ListGroupPolicies";
const _LGPR = "ListGroupPoliciesRequest";
const _LGPRi = "ListGroupPoliciesResponse";
const _LGR = "ListGroupsRequest";
const _LGRi = "ListGroupsResponse";
const _LIP = "ListInstanceProfiles";
const _LIPFR = "ListInstanceProfilesForRole";
const _LIPFRR = "ListInstanceProfilesForRoleRequest";
const _LIPFRRi = "ListInstanceProfilesForRoleResponse";
const _LIPR = "ListInstanceProfilesRequest";
const _LIPRi = "ListInstanceProfilesResponse";
const _LIPT = "ListInstanceProfileTags";
const _LIPTR = "ListInstanceProfileTagsRequest";
const _LIPTRi = "ListInstanceProfileTagsResponse";
const _LMFAD = "ListMFADevices";
const _LMFADR = "ListMFADevicesRequest";
const _LMFADRi = "ListMFADevicesResponse";
const _LMFADT = "ListMFADeviceTags";
const _LMFADTR = "ListMFADeviceTagsRequest";
const _LMFADTRi = "ListMFADeviceTagsResponse";
const _LOF = "ListOrganizationsFeatures";
const _LOFR = "ListOrganizationsFeaturesRequest";
const _LOFRi = "ListOrganizationsFeaturesResponse";
const _LOIDCP = "ListOpenIDConnectProviders";
const _LOIDCPR = "ListOpenIDConnectProvidersRequest";
const _LOIDCPRi = "ListOpenIDConnectProvidersResponse";
const _LOIDCPT = "ListOpenIDConnectProviderTags";
const _LOIDCPTR = "ListOpenIDConnectProviderTagsRequest";
const _LOIDCPTRi = "ListOpenIDConnectProviderTagsResponse";
const _LP = "LoginProfile";
const _LPGSA = "ListPoliciesGrantingServiceAccess";
const _LPGSAE = "ListPoliciesGrantingServiceAccessEntry";
const _LPGSAR = "ListPoliciesGrantingServiceAccessRequest";
const _LPGSARi = "ListPoliciesGrantingServiceAccessResponse";
const _LPR = "ListPoliciesRequest";
const _LPRi = "ListPoliciesResponse";
const _LPT = "ListPolicyTags";
const _LPTR = "ListPolicyTagsRequest";
const _LPTRi = "ListPolicyTagsResponse";
const _LPV = "ListPolicyVersions";
const _LPVR = "ListPolicyVersionsRequest";
const _LPVRi = "ListPolicyVersionsResponse";
const _LPi = "ListPolicies";
const _LR = "ListRoles";
const _LRP = "ListRolePolicies";
const _LRPR = "ListRolePoliciesRequest";
const _LRPRi = "ListRolePoliciesResponse";
const _LRR = "ListRolesRequest";
const _LRRi = "ListRolesResponse";
const _LRT = "ListRoleTags";
const _LRTR = "ListRoleTagsRequest";
const _LRTRi = "ListRoleTagsResponse";
const _LSAMLP = "ListSAMLProviders";
const _LSAMLPR = "ListSAMLProvidersRequest";
const _LSAMLPRi = "ListSAMLProvidersResponse";
const _LSAMLPT = "ListSAMLProviderTags";
const _LSAMLPTR = "ListSAMLProviderTagsRequest";
const _LSAMLPTRi = "ListSAMLProviderTagsResponse";
const _LSC = "ListServerCertificates";
const _LSCR = "ListServerCertificatesRequest";
const _LSCRi = "ListServerCertificatesResponse";
const _LSCRis = "ListSigningCertificatesRequest";
const _LSCRist = "ListSigningCertificatesResponse";
const _LSCT = "ListServerCertificateTags";
const _LSCTR = "ListServerCertificateTagsRequest";
const _LSCTRi = "ListServerCertificateTagsResponse";
const _LSCi = "ListSigningCertificates";
const _LSSC = "ListServiceSpecificCredentials";
const _LSSCR = "ListServiceSpecificCredentialsRequest";
const _LSSCRi = "ListServiceSpecificCredentialsResponse";
const _LSSHPK = "ListSSHPublicKeys";
const _LSSHPKR = "ListSSHPublicKeysRequest";
const _LSSHPKRi = "ListSSHPublicKeysResponse";
const _LU = "ListUsers";
const _LUD = "LastUsedDate";
const _LUP = "ListUserPolicies";
const _LUPR = "ListUserPoliciesRequest";
const _LUPRi = "ListUserPoliciesResponse";
const _LUR = "ListUsersRequest";
const _LURi = "ListUsersResponse";
const _LUT = "ListUserTags";
const _LUTR = "ListUserTagsRequest";
const _LUTRi = "ListUserTagsResponse";
const _LVMFAD = "ListVirtualMFADevices";
const _LVMFADR = "ListVirtualMFADevicesRequest";
const _LVMFADRi = "ListVirtualMFADevicesResponse";
const _Li = "Line";
const _M = "Message";
const _MCE = "MalformedCertificateException";
const _MCV = "MissingContextValues";
const _MFAD = "MFADevices";
const _MFADe = "MFADevice";
const _MI = "MaxItems";
const _MPA = "MaxPasswordAge";
const _MPD = "ManagedPolicyDetail";
const _MPDE = "MalformedPolicyDocumentException";
const _MPDLT = "ManagedPolicyDetailListType";
const _MPL = "MinimumPasswordLength";
const _MS = "MatchedStatements";
const _MSD = "MaxSessionDuration";
const _Ma = "Marker";
const _N = "Name";
const _NC = "NotificationChannel";
const _NGN = "NewGroupName";
const _NOSA = "NumberOfServicesAccessible";
const _NOSNA = "NumberOfServicesNotAccessed";
const _NP = "NewPassword";
const _NPe = "NewPath";
const _NSCN = "NewServerCertificateName";
const _NSEE = "NoSuchEntityException";
const _NUN = "NewUserName";
const _No = "Notes";
const _OA = "OnlyAttached";
const _OAI = "OwnerAccountId";
const _ODD = "OrganizationsDecisionDetail";
const _OI = "OwnerId";
const _OIDCPA = "OpenIDConnectProviderArn";
const _OIDCPL = "OpenIDConnectProviderList";
const _OIDCPLE = "OpenIDConnectProviderListEntry";
const _OIDCPLT = "OpenIDConnectProviderListType";
const _OIICEE = "OpenIdIdpCommunicationErrorException";
const _OIr = "OrganizationId";
const _ONFE = "OrganizationNotFoundException";
const _ONIAFME = "OrganizationNotInAllFeaturesModeException";
const _OP = "OldPassword";
const _OPI = "OrganizationsPolicyId";
const _OSBO = "OnlySendByOwner";
const _P = "Permissions";
const _PA = "PolicyArn";
const _PB = "PermissionsBoundary";
const _PBA = "PermissionsBoundaryArn";
const _PBDD = "PermissionsBoundaryDecisionDetail";
const _PBPIL = "PermissionsBoundaryPolicyInputList";
const _PBT = "PermissionsBoundaryType";
const _PBUC = "PermissionsBoundaryUsageCount";
const _PCR = "PermissionCheckResult";
const _PCS = "PermissionCheckStatus";
const _PD = "PolicyDocument";
const _PDo = "PolicyDetail";
const _PEE = "PolicyEvaluationException";
const _PG = "PolicyGroups";
const _PGLT = "PolicyGroupListType";
const _PGP = "PutGroupPolicy";
const _PGPR = "PutGroupPolicyRequest";
const _PGSA = "PoliciesGrantingServiceAccess";
const _PGSAo = "PolicyGrantingServiceAccess";
const _PGo = "PolicyGroup";
const _PI = "PolicyId";
const _PIL = "PolicyInputList";
const _PK = "PrivateKey";
const _PKL = "PrivateKeyList";
const _PLU = "PasswordLastUsed";
const _PN = "PolicyName";
const _PNAE = "PolicyNotAttachableException";
const _PNo = "PolicyNames";
const _PP = "PermissionPolicy";
const _PPVE = "PasswordPolicyViolationException";
const _PPa = "PasswordPolicy";
const _PPat = "PathPrefix";
const _PPo = "PolicyParameter";
const _PR = "PolicyRoles";
const _PRLT = "PolicyRoleListType";
const _PRP = "PasswordReusePrevention";
const _PRPB = "PutRolePermissionsBoundary";
const _PRPBR = "PutRolePermissionsBoundaryRequest";
const _PRPR = "PutRolePolicyRequest";
const _PRPu = "PutRolePolicy";
const _PRR = "PasswordResetRequired";
const _PRo = "PolicyRole";
const _PSA = "PolicySourceArn";
const _PT = "PolicyType";
const _PTA = "PolicyTemplateArn";
const _PU = "PolicyUsers";
const _PUF = "PolicyUsageFilter";
const _PULT = "PolicyUserListType";
const _PUP = "PutUserPolicy";
const _PUPB = "PutUserPermissionsBoundary";
const _PUPBR = "PutUserPermissionsBoundaryRequest";
const _PUPR = "PutUserPolicyRequest";
const _PUo = "PolicyUser";
const _PV = "PolicyVersion";
const _PVL = "PolicyVersionList";
const _Pa = "Path";
const _Par = "Parameters";
const _Pas = "Password";
const _Po = "Policy";
const _Pol = "Policies";
const _Pos = "Position";
const _QRCPNG = "QRCodePNG";
const _R = "Region";
const _RA = "ResourceArns";
const _RCIDFOIDCP = "RemoveClientIDFromOpenIDConnectProvider";
const _RCIDFOIDCPR = "RemoveClientIDFromOpenIDConnectProviderRequest";
const _RD = "RoleDetail";
const _RDL = "RoleDetailList";
const _RDR = "RejectDelegationRequest";
const _RDRR = "RejectDelegationRequestRequest";
const _RF = "ReportFormat";
const _RGLEE = "ReportGenerationLimitExceededException";
const _RHO = "ResourceHandlingOption";
const _RI = "RequestorId";
const _RIo = "RoleId";
const _RLC = "RequireLowercaseCharacters";
const _RLU = "RoleLastUsed";
const _RM = "RequestMessage";
const _RMFAD = "ResyncMFADevice";
const _RMFADR = "ResyncMFADeviceRequest";
const _RN = "RoleName";
const _RNe = "RequestorName";
const _RNeq = "RequireNumbers";
const _RO = "ResourceOwner";
const _RP = "ResourcePolicy";
const _RPK = "RemovePrivateKey";
const _RPL = "RolePolicyList";
const _RPRA = "RolePermissionRestrictionArns";
const _RR = "RejectionReason";
const _RRFIP = "RemoveRoleFromInstanceProfile";
const _RRFIPR = "RemoveRoleFromInstanceProfileRequest";
const _RS = "RequireSymbols";
const _RSR = "ResourceSpecificResults";
const _RSRLT = "ResourceSpecificResultListType";
const _RSRe = "ResourceSpecificResult";
const _RSSC = "ResetServiceSpecificCredential";
const _RSSCR = "ResetServiceSpecificCredentialRequest";
const _RSSCRe = "ResetServiceSpecificCredentialResponse";
const _RU = "RedirectUrl";
const _RUC = "RequireUppercaseCharacters";
const _RUFG = "RemoveUserFromGroup";
const _RUFGR = "RemoveUserFromGroupRequest";
const _RUL = "RoleUsageList";
const _RULT = "RoleUsageListType";
const _RUT = "RoleUsageType";
const _RWI = "RequestorWorkflowId";
const _Re = "Reason";
const _Res = "Resources";
const _Ro = "Role";
const _Rol = "Roles";
const _S = "Status";
const _SAD = "SetAsDefault";
const _SAK = "SecretAccessKey";
const _SAMLMD = "SAMLMetadataDocument";
const _SAMLPA = "SAMLProviderArn";
const _SAMLPK = "SAMLPrivateKey";
const _SAMLPL = "SAMLProviderList";
const _SAMLPLE = "SAMLProviderListEntry";
const _SAMLPLT = "SAMLProviderListType";
const _SAMLPUUID = "SAMLProviderUUID";
const _SANEE = "ServiceAccessNotEnabledException";
const _SC = "SummaryContent";
const _SCA = "ServiceCredentialAlias";
const _SCI = "ServerCertificateId";
const _SCM = "ServerCertificateMetadata";
const _SCML = "ServerCertificateMetadataList";
const _SCN = "ServerCertificateName";
const _SCP = "SimulateCustomPolicy";
const _SCPR = "SimulateCustomPolicyRequest";
const _SCS = "ServiceCredentialSecret";
const _SCe = "ServerCertificate";
const _SCi = "SigningCertificate";
const _SD = "SessionDuration";
const _SDPV = "SetDefaultPolicyVersion";
const _SDPVR = "SetDefaultPolicyVersionRequest";
const _SDT = "SendDelegationToken";
const _SDTR = "SendDelegationTokenRequest";
const _SFE = "ServiceFailureException";
const _SK = "SortKey";
const _SLA = "ServicesLastAccessed";
const _SLAe = "ServiceLastAccessed";
const _SLT = "StatementListType";
const _SM = "SummaryMap";
const _SN = "ServiceName";
const _SNSE = "ServiceNotSupportedException";
const _SNe = "ServiceNamespace";
const _SNer = "SerialNumber";
const _SNerv = "ServiceNamespaces";
const _SP = "ServicePassword";
const _SPI = "SourcePolicyId";
const _SPP = "SimulatePrincipalPolicy";
const _SPPR = "SimulatePrincipalPolicyRequest";
const _SPR = "SimulatePolicyResponse";
const _SPT = "SourcePolicyType";
const _SPt = "StartPosition";
const _SS = "SummaryState";
const _SSC = "ServiceSpecificCredential";
const _SSCI = "ServiceSpecificCredentialId";
const _SSCLT = "ServiceSpecificCredentialsListType";
const _SSCM = "ServiceSpecificCredentialMetadata";
const _SSCe = "ServiceSpecificCredentials";
const _SSHPK = "SSHPublicKey";
const _SSHPKB = "SSHPublicKeyBody";
const _SSHPKI = "SSHPublicKeyId";
const _SSHPKLT = "SSHPublicKeyListType";
const _SSHPKM = "SSHPublicKeyMetadata";
const _SSHPKu = "SSHPublicKeys";
const _SSTSP = "SetSecurityTokenServicePreferences";
const _SSTSPR = "SetSecurityTokenServicePreferencesRequest";
const _SUN = "ServiceUserName";
const _Sc = "Scope";
const _St = "State";
const _Sta = "Statement";
const _T = "Tags";
const _TAE = "TotalAuthenticatedEntities";
const _TALA = "TrackedActionsLastAccessed";
const _TALAr = "TrackedActionLastAccessed";
const _TIP = "TagInstanceProfile";
const _TIPR = "TagInstanceProfileRequest";
const _TK = "TagKeys";
const _TL = "ThumbprintList";
const _TMFAD = "TagMFADevice";
const _TMFADR = "TagMFADeviceRequest";
const _TOIDCP = "TagOpenIDConnectProvider";
const _TOIDCPR = "TagOpenIDConnectProviderRequest";
const _TP = "TagPolicy";
const _TPR = "TagPolicyRequest";
const _TR = "TagRole";
const _TRR = "TagRoleRequest";
const _TSAMLP = "TagSAMLProvider";
const _TSAMLPR = "TagSAMLProviderRequest";
const _TSC = "TagServerCertificate";
const _TSCR = "TagServerCertificateRequest";
const _TU = "TagUser";
const _TUR = "TagUserRequest";
const _Ta = "Tag";
const _Ti = "Timestamp";
const _Ty = "Type";
const _U = "Url";
const _UAK = "UpdateAccessKey";
const _UAKR = "UpdateAccessKeyRequest";
const _UAPP = "UpdateAccountPasswordPolicy";
const _UAPPR = "UpdateAccountPasswordPolicyRequest";
const _UARP = "UpdateAssumeRolePolicy";
const _UARPR = "UpdateAssumeRolePolicyRequest";
const _UD = "UpdateDate";
const _UDL = "UserDetailList";
const _UDR = "UpdateDelegationRequest";
const _UDRR = "UpdateDelegationRequestRequest";
const _UDp = "UploadDate";
const _UDs = "UserDetail";
const _UEE = "UnmodifiableEntityException";
const _UG = "UpdateGroup";
const _UGR = "UpdateGroupRequest";
const _UI = "UserId";
const _UIP = "UntagInstanceProfile";
const _UIPR = "UntagInstanceProfileRequest";
const _ULP = "UpdateLoginProfile";
const _ULPR = "UpdateLoginProfileRequest";
const _UMFAD = "UntagMFADevice";
const _UMFADR = "UntagMFADeviceRequest";
const _UN = "UserName";
const _UOIDCP = "UntagOpenIDConnectProvider";
const _UOIDCPR = "UntagOpenIDConnectProviderRequest";
const _UOIDCPT = "UpdateOpenIDConnectProviderThumbprint";
const _UOIDCPTR = "UpdateOpenIDConnectProviderThumbprintRequest";
const _UP = "UntagPolicy";
const _UPKEE = "UnrecognizedPublicKeyEncodingException";
const _UPL = "UserPolicyList";
const _UPR = "UntagPolicyRequest";
const _UR = "UntagRole";
const _URD = "UpdateRoleDescription";
const _URDR = "UpdateRoleDescriptionRequest";
const _URDRp = "UpdateRoleDescriptionResponse";
const _URR = "UntagRoleRequest";
const _URRp = "UpdateRoleRequest";
const _URRpd = "UpdateRoleResponse";
const _URp = "UpdateRole";
const _USAMLP = "UntagSAMLProvider";
const _USAMLPR = "UntagSAMLProviderRequest";
const _USAMLPRp = "UpdateSAMLProviderRequest";
const _USAMLPRpd = "UpdateSAMLProviderResponse";
const _USAMLPp = "UpdateSAMLProvider";
const _USC = "UntagServerCertificate";
const _USCR = "UntagServerCertificateRequest";
const _USCRp = "UpdateServerCertificateRequest";
const _USCRpd = "UpdateSigningCertificateRequest";
const _USCRpl = "UploadServerCertificateRequest";
const _USCRplo = "UploadServerCertificateResponse";
const _USCRploa = "UploadSigningCertificateRequest";
const _USCRpload = "UploadSigningCertificateResponse";
const _USCp = "UpdateServerCertificate";
const _USCpd = "UpdateSigningCertificate";
const _USCpl = "UploadServerCertificate";
const _USCplo = "UploadSigningCertificate";
const _USSC = "UpdateServiceSpecificCredential";
const _USSCR = "UpdateServiceSpecificCredentialRequest";
const _USSHPK = "UpdateSSHPublicKey";
const _USSHPKR = "UpdateSSHPublicKeyRequest";
const _USSHPKRp = "UploadSSHPublicKeyRequest";
const _USSHPKRpl = "UploadSSHPublicKeyResponse";
const _USSHPKp = "UploadSSHPublicKey";
const _UT = "UpdatedTime";
const _UU = "UntagUser";
const _UUR = "UntagUserRequest";
const _UURp = "UpdateUserRequest";
const _UUp = "UpdateUser";
const _Us = "User";
const _Use = "Users";
const _V = "Versions";
const _VI = "VersionId";
const _VMFAD = "VirtualMFADevice";
const _VMFADN = "VirtualMFADeviceName";
const _VMFADi = "VirtualMFADevices";
const _VU = "ValidUntil";
const _Va = "Values";
const _Val = "Value";
const _aKMLT = "accessKeyMetadataListType";
const _aKST = "accessKeySecretType";
const _aPLT = "attachedPoliciesListType";
const _aQE = "awsQueryError";
const _c = "client";
const _cLT = "certificateListType";
const _dRLT = "delegationRequestsListType";
const _e = "error";
const _eDLT = "entityDetailsListType";
const _gDLT = "groupDetailListType";
const _gLT = "groupListType";
const _hE = "httpError";
const _iPLT = "instanceProfileListType";
const _iT = "isTruncated";
const _lPGSARLT = "listPolicyGrantingServiceAccessResponseListType";
const _m = "message";
const _mDLT = "mfaDeviceListType";
const _pDLT = "policyDetailListType";
const _pDVLT = "policyDocumentVersionListType";
const _pGSALT = "policyGrantingServiceAccessListType";
const _pKL = "privateKeyList";
const _pKT = "privateKeyType";
const _pLT = "policyListType";
const _pPLT = "policyParameterListType";
const _pT = "passwordType";
const _rDLT = "roleDetailListType";
const _rLT = "roleListType";
const _s = "server";
const _sCMLT = "serverCertificateMetadataListType";
const _sCS = "serviceCredentialSecret";
const _sP = "servicePassword";
const _sm = "smithy.ts.sdk.synthetic.com.amazonaws.iam";
const _tLT = "tagListType";
const _uDLT = "userDetailListType";
const _uLT = "userListType";
const _vMFADLT = "virtualMFADeviceListType";
const n0 = "com.amazonaws.iam";
var accessKeySecretType = [0, n0, _aKST, 8, 0];
var BootstrapDatum = [0, n0, _BD, 8, 21];
var passwordType = [0, n0, _pT, 8, 0];
var privateKeyType = [0, n0, _pKT, 8, 0];
var serviceCredentialSecret = [0, n0, _sCS, 8, 0];
var servicePassword = [0, n0, _sP, 8, 0];
var AcceptDelegationRequestRequest$ = [3, n0, _ADRR,
    0,
    [_DRI],
    [0], 1
];
var AccessDetail$ = [3, n0, _AD,
    0,
    [_SN, _SNe, _R, _EP, _LAT, _TAE],
    [0, 0, 0, 0, 4, 1], 2
];
var AccessKey$ = [3, n0, _AK,
    0,
    [_UN, _AKI, _S, _SAK, _CD],
    [0, 0, 0, [() => accessKeySecretType, 0], 4], 4
];
var AccessKeyLastUsed$ = [3, n0, _AKLU,
    0,
    [_SN, _R, _LUD],
    [0, 0, 4], 2
];
var AccessKeyMetadata$ = [3, n0, _AKM,
    0,
    [_UN, _AKI, _S, _CD],
    [0, 0, 0, 4]
];
var AccountNotManagementOrDelegatedAdministratorException$ = [-3, n0, _ANMODAE,
    { [_e]: _c, [_hE]: 400 },
    [_M],
    [0]
];
schema.TypeRegistry.for(n0).registerError(AccountNotManagementOrDelegatedAdministratorException$, AccountNotManagementOrDelegatedAdministratorException);
var AddClientIDToOpenIDConnectProviderRequest$ = [3, n0, _ACIDTOIDCPR,
    0,
    [_OIDCPA, _CID],
    [0, 0], 2
];
var AddRoleToInstanceProfileRequest$ = [3, n0, _ARTIPR,
    0,
    [_IPN, _RN],
    [0, 0], 2
];
var AddUserToGroupRequest$ = [3, n0, _AUTGR,
    0,
    [_GN, _UN],
    [0, 0], 2
];
var AssociateDelegationRequestRequest$ = [3, n0, _ADRRs,
    0,
    [_DRI],
    [0], 1
];
var AttachedPermissionsBoundary$ = [3, n0, _APB,
    0,
    [_PBT, _PBA],
    [0, 0]
];
var AttachedPolicy$ = [3, n0, _AP,
    0,
    [_PN, _PA],
    [0, 0]
];
var AttachGroupPolicyRequest$ = [3, n0, _AGPR,
    0,
    [_GN, _PA],
    [0, 0], 2
];
var AttachRolePolicyRequest$ = [3, n0, _ARPR,
    0,
    [_RN, _PA],
    [0, 0], 2
];
var AttachUserPolicyRequest$ = [3, n0, _AUPR,
    0,
    [_UN, _PA],
    [0, 0], 2
];
var CallerIsNotManagementAccountException$ = [-3, n0, _CINMAE,
    { [_e]: _c, [_hE]: 400 },
    [_M],
    [0]
];
schema.TypeRegistry.for(n0).registerError(CallerIsNotManagementAccountException$, CallerIsNotManagementAccountException);
var ChangePasswordRequest$ = [3, n0, _CPR,
    0,
    [_OP, _NP],
    [[() => passwordType, 0], [() => passwordType, 0]], 2
];
var ConcurrentModificationException$ = [-3, n0, _CME,
    { [_aQE]: [`ConcurrentModification`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(ConcurrentModificationException$, ConcurrentModificationException);
var ContextEntry$ = [3, n0, _CE,
    0,
    [_CKN, _CKV, _CKT],
    [0, 64 | 0, 0]
];
var CreateAccessKeyRequest$ = [3, n0, _CAKR,
    0,
    [_UN],
    [0]
];
var CreateAccessKeyResponse$ = [3, n0, _CAKRr,
    0,
    [_AK],
    [[() => AccessKey$, 0]], 1
];
var CreateAccountAliasRequest$ = [3, n0, _CAAR,
    0,
    [_AA],
    [0], 1
];
var CreateDelegationRequestRequest$ = [3, n0, _CDRR,
    0,
    [_D, _P, _RWI, _NC, _SD, _OAI, _RM, _RU, _OSBO],
    [0, () => DelegationPermission$, 0, 0, 1, 0, 0, 0, 2], 5
];
var CreateDelegationRequestResponse$ = [3, n0, _CDRRr,
    0,
    [_CDL, _DRI],
    [0, 0]
];
var CreateGroupRequest$ = [3, n0, _CGR,
    0,
    [_GN, _Pa],
    [0, 0], 1
];
var CreateGroupResponse$ = [3, n0, _CGRr,
    0,
    [_G],
    [() => Group$], 1
];
var CreateInstanceProfileRequest$ = [3, n0, _CIPR,
    0,
    [_IPN, _Pa, _T],
    [0, 0, () => tagListType], 1
];
var CreateInstanceProfileResponse$ = [3, n0, _CIPRr,
    0,
    [_IP],
    [() => InstanceProfile$], 1
];
var CreateLoginProfileRequest$ = [3, n0, _CLPR,
    0,
    [_UN, _Pas, _PRR],
    [0, [() => passwordType, 0], 2]
];
var CreateLoginProfileResponse$ = [3, n0, _CLPRr,
    0,
    [_LP],
    [() => LoginProfile$], 1
];
var CreateOpenIDConnectProviderRequest$ = [3, n0, _COIDCPR,
    0,
    [_U, _CIDL, _TL, _T],
    [0, 64 | 0, 64 | 0, () => tagListType], 1
];
var CreateOpenIDConnectProviderResponse$ = [3, n0, _COIDCPRr,
    0,
    [_OIDCPA, _T],
    [0, () => tagListType]
];
var CreatePolicyRequest$ = [3, n0, _CPRr,
    0,
    [_PN, _PD, _Pa, _D, _T],
    [0, 0, 0, 0, () => tagListType], 2
];
var CreatePolicyResponse$ = [3, n0, _CPRre,
    0,
    [_Po],
    [() => Policy$]
];
var CreatePolicyVersionRequest$ = [3, n0, _CPVR,
    0,
    [_PA, _PD, _SAD],
    [0, 0, 2], 2
];
var CreatePolicyVersionResponse$ = [3, n0, _CPVRr,
    0,
    [_PV],
    [() => PolicyVersion$]
];
var CreateRoleRequest$ = [3, n0, _CRR,
    0,
    [_RN, _ARPD, _Pa, _D, _MSD, _PB, _T],
    [0, 0, 0, 0, 1, 0, () => tagListType], 2
];
var CreateRoleResponse$ = [3, n0, _CRRr,
    0,
    [_Ro],
    [() => Role$], 1
];
var CreateSAMLProviderRequest$ = [3, n0, _CSAMLPR,
    0,
    [_SAMLMD, _N, _T, _AEM, _APK],
    [0, 0, () => tagListType, 0, [() => privateKeyType, 0]], 2
];
var CreateSAMLProviderResponse$ = [3, n0, _CSAMLPRr,
    0,
    [_SAMLPA, _T],
    [0, () => tagListType]
];
var CreateServiceLinkedRoleRequest$ = [3, n0, _CSLRR,
    0,
    [_AWSSN, _D, _CS],
    [0, 0, 0], 1
];
var CreateServiceLinkedRoleResponse$ = [3, n0, _CSLRRr,
    0,
    [_Ro],
    [() => Role$]
];
var CreateServiceSpecificCredentialRequest$ = [3, n0, _CSSCR,
    0,
    [_UN, _SN, _CAD],
    [0, 0, 1], 2
];
var CreateServiceSpecificCredentialResponse$ = [3, n0, _CSSCRr,
    0,
    [_SSC],
    [[() => ServiceSpecificCredential$, 0]]
];
var CreateUserRequest$ = [3, n0, _CUR,
    0,
    [_UN, _Pa, _PB, _T],
    [0, 0, 0, () => tagListType], 1
];
var CreateUserResponse$ = [3, n0, _CURr,
    0,
    [_Us],
    [() => User$]
];
var CreateVirtualMFADeviceRequest$ = [3, n0, _CVMFADR,
    0,
    [_VMFADN, _Pa, _T],
    [0, 0, () => tagListType], 1
];
var CreateVirtualMFADeviceResponse$ = [3, n0, _CVMFADRr,
    0,
    [_VMFAD],
    [[() => VirtualMFADevice$, 0]], 1
];
var CredentialReportExpiredException$ = [-3, n0, _CREE,
    { [_aQE]: [`ReportExpired`, 410], [_e]: _c, [_hE]: 410 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(CredentialReportExpiredException$, CredentialReportExpiredException);
var CredentialReportNotPresentException$ = [-3, n0, _CRNPE,
    { [_aQE]: [`ReportNotPresent`, 410], [_e]: _c, [_hE]: 410 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(CredentialReportNotPresentException$, CredentialReportNotPresentException);
var CredentialReportNotReadyException$ = [-3, n0, _CRNRE,
    { [_aQE]: [`ReportInProgress`, 404], [_e]: _c, [_hE]: 404 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(CredentialReportNotReadyException$, CredentialReportNotReadyException);
var DeactivateMFADeviceRequest$ = [3, n0, _DMFADR,
    0,
    [_SNer, _UN],
    [0, 0], 1
];
var DelegationPermission$ = [3, n0, _DP,
    0,
    [_PTA, _Par],
    [0, () => policyParameterListType]
];
var DelegationRequest$ = [3, n0, _DR,
    0,
    [_DRI, _OAI, _D, _RM, _P, _PP, _RPRA, _OI, _AI, _St, _ET, _RI, _RNe, _CD, _SD, _RU, _No, _RR, _OSBO, _UT],
    [0, 0, 0, 0, () => DelegationPermission$, 0, 64 | 0, 0, 0, 0, 4, 0, 0, 4, 1, 0, 0, 0, 2, 4]
];
var DeleteAccessKeyRequest$ = [3, n0, _DAKR,
    0,
    [_AKI, _UN],
    [0, 0], 1
];
var DeleteAccountAliasRequest$ = [3, n0, _DAAR,
    0,
    [_AA],
    [0], 1
];
var DeleteConflictException$ = [-3, n0, _DCE,
    { [_aQE]: [`DeleteConflict`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(DeleteConflictException$, DeleteConflictException);
var DeleteGroupPolicyRequest$ = [3, n0, _DGPR,
    0,
    [_GN, _PN],
    [0, 0], 2
];
var DeleteGroupRequest$ = [3, n0, _DGR,
    0,
    [_GN],
    [0], 1
];
var DeleteInstanceProfileRequest$ = [3, n0, _DIPR,
    0,
    [_IPN],
    [0], 1
];
var DeleteLoginProfileRequest$ = [3, n0, _DLPR,
    0,
    [_UN],
    [0]
];
var DeleteOpenIDConnectProviderRequest$ = [3, n0, _DOIDCPR,
    0,
    [_OIDCPA],
    [0], 1
];
var DeletePolicyRequest$ = [3, n0, _DPR,
    0,
    [_PA],
    [0], 1
];
var DeletePolicyVersionRequest$ = [3, n0, _DPVR,
    0,
    [_PA, _VI],
    [0, 0], 2
];
var DeleteRolePermissionsBoundaryRequest$ = [3, n0, _DRPBR,
    0,
    [_RN],
    [0], 1
];
var DeleteRolePolicyRequest$ = [3, n0, _DRPR,
    0,
    [_RN, _PN],
    [0, 0], 2
];
var DeleteRoleRequest$ = [3, n0, _DRR,
    0,
    [_RN],
    [0], 1
];
var DeleteSAMLProviderRequest$ = [3, n0, _DSAMLPR,
    0,
    [_SAMLPA],
    [0], 1
];
var DeleteServerCertificateRequest$ = [3, n0, _DSCR,
    0,
    [_SCN],
    [0], 1
];
var DeleteServiceLinkedRoleRequest$ = [3, n0, _DSLRR,
    0,
    [_RN],
    [0], 1
];
var DeleteServiceLinkedRoleResponse$ = [3, n0, _DSLRRe,
    0,
    [_DTI],
    [0], 1
];
var DeleteServiceSpecificCredentialRequest$ = [3, n0, _DSSCR,
    0,
    [_SSCI, _UN],
    [0, 0], 1
];
var DeleteSigningCertificateRequest$ = [3, n0, _DSCRe,
    0,
    [_CI, _UN],
    [0, 0], 1
];
var DeleteSSHPublicKeyRequest$ = [3, n0, _DSSHPKR,
    0,
    [_UN, _SSHPKI],
    [0, 0], 2
];
var DeleteUserPermissionsBoundaryRequest$ = [3, n0, _DUPBR,
    0,
    [_UN],
    [0], 1
];
var DeleteUserPolicyRequest$ = [3, n0, _DUPR,
    0,
    [_UN, _PN],
    [0, 0], 2
];
var DeleteUserRequest$ = [3, n0, _DUR,
    0,
    [_UN],
    [0], 1
];
var DeleteVirtualMFADeviceRequest$ = [3, n0, _DVMFADR,
    0,
    [_SNer],
    [0], 1
];
var DeletionTaskFailureReasonType$ = [3, n0, _DTFRT,
    0,
    [_Re, _RUL],
    [0, () => RoleUsageListType]
];
var DetachGroupPolicyRequest$ = [3, n0, _DGPRe,
    0,
    [_GN, _PA],
    [0, 0], 2
];
var DetachRolePolicyRequest$ = [3, n0, _DRPRe,
    0,
    [_RN, _PA],
    [0, 0], 2
];
var DetachUserPolicyRequest$ = [3, n0, _DUPRe,
    0,
    [_UN, _PA],
    [0, 0], 2
];
var DisableOrganizationsRootCredentialsManagementRequest$ = [3, n0, _DORCMR,
    0,
    [],
    []
];
var DisableOrganizationsRootCredentialsManagementResponse$ = [3, n0, _DORCMRi,
    0,
    [_OIr, _EF],
    [0, 64 | 0]
];
var DisableOrganizationsRootSessionsRequest$ = [3, n0, _DORSR,
    0,
    [],
    []
];
var DisableOrganizationsRootSessionsResponse$ = [3, n0, _DORSRi,
    0,
    [_OIr, _EF],
    [0, 64 | 0]
];
var DuplicateCertificateException$ = [-3, n0, _DCEu,
    { [_aQE]: [`DuplicateCertificate`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(DuplicateCertificateException$, DuplicateCertificateException);
var DuplicateSSHPublicKeyException$ = [-3, n0, _DSSHPKE,
    { [_aQE]: [`DuplicateSSHPublicKey`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(DuplicateSSHPublicKeyException$, DuplicateSSHPublicKeyException);
var EnableMFADeviceRequest$ = [3, n0, _EMFADR,
    0,
    [_UN, _SNer, _AC, _ACu],
    [0, 0, 0, 0], 4
];
var EnableOrganizationsRootCredentialsManagementRequest$ = [3, n0, _EORCMR,
    0,
    [],
    []
];
var EnableOrganizationsRootCredentialsManagementResponse$ = [3, n0, _EORCMRn,
    0,
    [_OIr, _EF],
    [0, 64 | 0]
];
var EnableOrganizationsRootSessionsRequest$ = [3, n0, _EORSR,
    0,
    [],
    []
];
var EnableOrganizationsRootSessionsResponse$ = [3, n0, _EORSRn,
    0,
    [_OIr, _EF],
    [0, 64 | 0]
];
var EnableOutboundWebIdentityFederationResponse$ = [3, n0, _EOWIFR,
    0,
    [_II],
    [0]
];
var EntityAlreadyExistsException$ = [-3, n0, _EAEE,
    { [_aQE]: [`EntityAlreadyExists`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(EntityAlreadyExistsException$, EntityAlreadyExistsException);
var EntityDetails$ = [3, n0, _ED,
    0,
    [_EI, _LA],
    [() => EntityInfo$, 4], 1
];
var EntityInfo$ = [3, n0, _EI,
    0,
    [_A, _N, _Ty, _I, _Pa],
    [0, 0, 0, 0, 0], 4
];
var EntityTemporarilyUnmodifiableException$ = [-3, n0, _ETUE,
    { [_aQE]: [`EntityTemporarilyUnmodifiable`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(EntityTemporarilyUnmodifiableException$, EntityTemporarilyUnmodifiableException);
var ErrorDetails$ = [3, n0, _EDr,
    0,
    [_M, _C],
    [0, 0], 2
];
var EvaluationResult$ = [3, n0, _ER,
    0,
    [_EAN, _EDv, _ERN, _MS, _MCV, _ODD, _PBDD, _EDD, _RSR],
    [0, 0, 0, () => StatementListType, 64 | 0, () => OrganizationsDecisionDetail$, () => PermissionsBoundaryDecisionDetail$, 128 | 0, () => ResourceSpecificResultListType], 2
];
var FeatureDisabledException$ = [-3, n0, _FDE,
    { [_aQE]: [`FeatureDisabled`, 404], [_e]: _c, [_hE]: 404 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(FeatureDisabledException$, FeatureDisabledException);
var FeatureEnabledException$ = [-3, n0, _FEE,
    { [_aQE]: [`FeatureEnabled`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(FeatureEnabledException$, FeatureEnabledException);
var GenerateCredentialReportResponse$ = [3, n0, _GCRR,
    0,
    [_St, _D],
    [0, 0]
];
var GenerateOrganizationsAccessReportRequest$ = [3, n0, _GOARR,
    0,
    [_EP, _OPI],
    [0, 0], 1
];
var GenerateOrganizationsAccessReportResponse$ = [3, n0, _GOARRe,
    0,
    [_JI],
    [0]
];
var GenerateServiceLastAccessedDetailsRequest$ = [3, n0, _GSLADR,
    0,
    [_A, _Gr],
    [0, 0], 1
];
var GenerateServiceLastAccessedDetailsResponse$ = [3, n0, _GSLADRe,
    0,
    [_JI],
    [0]
];
var GetAccessKeyLastUsedRequest$ = [3, n0, _GAKLUR,
    0,
    [_AKI],
    [0], 1
];
var GetAccessKeyLastUsedResponse$ = [3, n0, _GAKLURe,
    0,
    [_UN, _AKLU],
    [0, () => AccessKeyLastUsed$]
];
var GetAccountAuthorizationDetailsRequest$ = [3, n0, _GAADR,
    0,
    [_F, _MI, _Ma],
    [64 | 0, 1, 0]
];
var GetAccountAuthorizationDetailsResponse$ = [3, n0, _GAADRe,
    0,
    [_UDL, _GDL, _RDL, _Pol, _IT, _Ma],
    [() => userDetailListType, () => groupDetailListType, () => roleDetailListType, () => ManagedPolicyDetailListType, 2, 0]
];
var GetAccountPasswordPolicyResponse$ = [3, n0, _GAPPR,
    0,
    [_PPa],
    [() => PasswordPolicy$], 1
];
var GetAccountSummaryResponse$ = [3, n0, _GASR,
    0,
    [_SM],
    [128 | 1]
];
var GetContextKeysForCustomPolicyRequest$ = [3, n0, _GCKFCPR,
    0,
    [_PIL],
    [64 | 0], 1
];
var GetContextKeysForPolicyResponse$ = [3, n0, _GCKFPR,
    0,
    [_CKNo],
    [64 | 0]
];
var GetContextKeysForPrincipalPolicyRequest$ = [3, n0, _GCKFPPR,
    0,
    [_PSA, _PIL],
    [0, 64 | 0], 1
];
var GetCredentialReportResponse$ = [3, n0, _GCRRe,
    0,
    [_Co, _RF, _GT],
    [21, 0, 4]
];
var GetDelegationRequestRequest$ = [3, n0, _GDRR,
    0,
    [_DRI, _DPC],
    [0, 2], 1
];
var GetDelegationRequestResponse$ = [3, n0, _GDRRe,
    0,
    [_DR, _PCS, _PCR],
    [() => DelegationRequest$, 0, 0]
];
var GetGroupPolicyRequest$ = [3, n0, _GGPR,
    0,
    [_GN, _PN],
    [0, 0], 2
];
var GetGroupPolicyResponse$ = [3, n0, _GGPRe,
    0,
    [_GN, _PN, _PD],
    [0, 0, 0], 3
];
var GetGroupRequest$ = [3, n0, _GGR,
    0,
    [_GN, _Ma, _MI],
    [0, 0, 1], 1
];
var GetGroupResponse$ = [3, n0, _GGRe,
    0,
    [_G, _Use, _IT, _Ma],
    [() => Group$, () => userListType, 2, 0], 2
];
var GetHumanReadableSummaryRequest$ = [3, n0, _GHRSR,
    0,
    [_EA, _L],
    [0, 0], 1
];
var GetHumanReadableSummaryResponse$ = [3, n0, _GHRSRe,
    0,
    [_SC, _L, _SS],
    [0, 0, 0]
];
var GetInstanceProfileRequest$ = [3, n0, _GIPR,
    0,
    [_IPN],
    [0], 1
];
var GetInstanceProfileResponse$ = [3, n0, _GIPRe,
    0,
    [_IP],
    [() => InstanceProfile$], 1
];
var GetLoginProfileRequest$ = [3, n0, _GLPR,
    0,
    [_UN],
    [0]
];
var GetLoginProfileResponse$ = [3, n0, _GLPRe,
    0,
    [_LP],
    [() => LoginProfile$], 1
];
var GetMFADeviceRequest$ = [3, n0, _GMFADR,
    0,
    [_SNer, _UN],
    [0, 0], 1
];
var GetMFADeviceResponse$ = [3, n0, _GMFADRe,
    0,
    [_SNer, _UN, _EDn, _Ce],
    [0, 0, 4, 128 | 0], 1
];
var GetOpenIDConnectProviderRequest$ = [3, n0, _GOIDCPR,
    0,
    [_OIDCPA],
    [0], 1
];
var GetOpenIDConnectProviderResponse$ = [3, n0, _GOIDCPRe,
    0,
    [_U, _CIDL, _TL, _CD, _T],
    [0, 64 | 0, 64 | 0, 4, () => tagListType]
];
var GetOrganizationsAccessReportRequest$ = [3, n0, _GOARRet,
    0,
    [_JI, _MI, _Ma, _SK],
    [0, 1, 0, 0], 1
];
var GetOrganizationsAccessReportResponse$ = [3, n0, _GOARRetr,
    0,
    [_JS, _JCD, _JCDo, _NOSA, _NOSNA, _ADc, _IT, _Ma, _EDr],
    [0, 4, 4, 1, 1, () => AccessDetails, 2, 0, () => ErrorDetails$], 2
];
var GetOutboundWebIdentityFederationInfoResponse$ = [3, n0, _GOWIFIR,
    0,
    [_II, _JVE],
    [0, 2]
];
var GetPolicyRequest$ = [3, n0, _GPR,
    0,
    [_PA],
    [0], 1
];
var GetPolicyResponse$ = [3, n0, _GPRe,
    0,
    [_Po],
    [() => Policy$]
];
var GetPolicyVersionRequest$ = [3, n0, _GPVR,
    0,
    [_PA, _VI],
    [0, 0], 2
];
var GetPolicyVersionResponse$ = [3, n0, _GPVRe,
    0,
    [_PV],
    [() => PolicyVersion$]
];
var GetRolePolicyRequest$ = [3, n0, _GRPR,
    0,
    [_RN, _PN],
    [0, 0], 2
];
var GetRolePolicyResponse$ = [3, n0, _GRPRe,
    0,
    [_RN, _PN, _PD],
    [0, 0, 0], 3
];
var GetRoleRequest$ = [3, n0, _GRR,
    0,
    [_RN],
    [0], 1
];
var GetRoleResponse$ = [3, n0, _GRRe,
    0,
    [_Ro],
    [() => Role$], 1
];
var GetSAMLProviderRequest$ = [3, n0, _GSAMLPR,
    0,
    [_SAMLPA],
    [0], 1
];
var GetSAMLProviderResponse$ = [3, n0, _GSAMLPRe,
    0,
    [_SAMLPUUID, _SAMLMD, _CD, _VU, _T, _AEM, _PKL],
    [0, 0, 4, 4, () => tagListType, 0, () => privateKeyList]
];
var GetServerCertificateRequest$ = [3, n0, _GSCR,
    0,
    [_SCN],
    [0], 1
];
var GetServerCertificateResponse$ = [3, n0, _GSCRe,
    0,
    [_SCe],
    [() => ServerCertificate$], 1
];
var GetServiceLastAccessedDetailsRequest$ = [3, n0, _GSLADRet,
    0,
    [_JI, _MI, _Ma],
    [0, 1, 0], 1
];
var GetServiceLastAccessedDetailsResponse$ = [3, n0, _GSLADRete,
    0,
    [_JS, _JCD, _SLA, _JCDo, _JT, _IT, _Ma, _E],
    [0, 4, () => ServicesLastAccessed, 4, 0, 2, 0, () => ErrorDetails$], 4
];
var GetServiceLastAccessedDetailsWithEntitiesRequest$ = [3, n0, _GSLADWER,
    0,
    [_JI, _SNe, _MI, _Ma],
    [0, 0, 1, 0], 2
];
var GetServiceLastAccessedDetailsWithEntitiesResponse$ = [3, n0, _GSLADWERe,
    0,
    [_JS, _JCD, _JCDo, _EDL, _IT, _Ma, _E],
    [0, 4, 4, () => entityDetailsListType, 2, 0, () => ErrorDetails$], 4
];
var GetServiceLinkedRoleDeletionStatusRequest$ = [3, n0, _GSLRDSR,
    0,
    [_DTI],
    [0], 1
];
var GetServiceLinkedRoleDeletionStatusResponse$ = [3, n0, _GSLRDSRe,
    0,
    [_S, _Re],
    [0, () => DeletionTaskFailureReasonType$], 1
];
var GetSSHPublicKeyRequest$ = [3, n0, _GSSHPKR,
    0,
    [_UN, _SSHPKI, _En],
    [0, 0, 0], 3
];
var GetSSHPublicKeyResponse$ = [3, n0, _GSSHPKRe,
    0,
    [_SSHPK],
    [() => SSHPublicKey$]
];
var GetUserPolicyRequest$ = [3, n0, _GUPR,
    0,
    [_UN, _PN],
    [0, 0], 2
];
var GetUserPolicyResponse$ = [3, n0, _GUPRe,
    0,
    [_UN, _PN, _PD],
    [0, 0, 0], 3
];
var GetUserRequest$ = [3, n0, _GUR,
    0,
    [_UN],
    [0]
];
var GetUserResponse$ = [3, n0, _GURe,
    0,
    [_Us],
    [() => User$], 1
];
var Group$ = [3, n0, _G,
    0,
    [_Pa, _GN, _GI, _A, _CD],
    [0, 0, 0, 0, 4], 5
];
var GroupDetail$ = [3, n0, _GD,
    0,
    [_Pa, _GN, _GI, _A, _CD, _GPL, _AMP],
    [0, 0, 0, 0, 4, () => policyDetailListType, () => attachedPoliciesListType]
];
var InstanceProfile$ = [3, n0, _IP,
    0,
    [_Pa, _IPN, _IPI, _A, _CD, _Rol, _T],
    [0, 0, 0, 0, 4, () => roleListType, () => tagListType], 6
];
var InvalidAuthenticationCodeException$ = [-3, n0, _IACE,
    { [_aQE]: [`InvalidAuthenticationCode`, 403], [_e]: _c, [_hE]: 403 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(InvalidAuthenticationCodeException$, InvalidAuthenticationCodeException);
var InvalidCertificateException$ = [-3, n0, _ICE,
    { [_aQE]: [`InvalidCertificate`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(InvalidCertificateException$, InvalidCertificateException);
var InvalidInputException$ = [-3, n0, _IIE,
    { [_aQE]: [`InvalidInput`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(InvalidInputException$, InvalidInputException);
var InvalidPublicKeyException$ = [-3, n0, _IPKE,
    { [_aQE]: [`InvalidPublicKey`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(InvalidPublicKeyException$, InvalidPublicKeyException);
var InvalidUserTypeException$ = [-3, n0, _IUTE,
    { [_aQE]: [`InvalidUserType`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(InvalidUserTypeException$, InvalidUserTypeException);
var KeyPairMismatchException$ = [-3, n0, _KPME,
    { [_aQE]: [`KeyPairMismatch`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(KeyPairMismatchException$, KeyPairMismatchException);
var LimitExceededException$ = [-3, n0, _LEE,
    { [_aQE]: [`LimitExceeded`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(LimitExceededException$, LimitExceededException);
var ListAccessKeysRequest$ = [3, n0, _LAKR,
    0,
    [_UN, _Ma, _MI],
    [0, 0, 1]
];
var ListAccessKeysResponse$ = [3, n0, _LAKRi,
    0,
    [_AKM, _IT, _Ma],
    [() => accessKeyMetadataListType, 2, 0], 1
];
var ListAccountAliasesRequest$ = [3, n0, _LAAR,
    0,
    [_Ma, _MI],
    [0, 1]
];
var ListAccountAliasesResponse$ = [3, n0, _LAARi,
    0,
    [_AAc, _IT, _Ma],
    [64 | 0, 2, 0], 1
];
var ListAttachedGroupPoliciesRequest$ = [3, n0, _LAGPR,
    0,
    [_GN, _PPat, _Ma, _MI],
    [0, 0, 0, 1], 1
];
var ListAttachedGroupPoliciesResponse$ = [3, n0, _LAGPRi,
    0,
    [_APt, _IT, _Ma],
    [() => attachedPoliciesListType, 2, 0]
];
var ListAttachedRolePoliciesRequest$ = [3, n0, _LARPR,
    0,
    [_RN, _PPat, _Ma, _MI],
    [0, 0, 0, 1], 1
];
var ListAttachedRolePoliciesResponse$ = [3, n0, _LARPRi,
    0,
    [_APt, _IT, _Ma],
    [() => attachedPoliciesListType, 2, 0]
];
var ListAttachedUserPoliciesRequest$ = [3, n0, _LAUPR,
    0,
    [_UN, _PPat, _Ma, _MI],
    [0, 0, 0, 1], 1
];
var ListAttachedUserPoliciesResponse$ = [3, n0, _LAUPRi,
    0,
    [_APt, _IT, _Ma],
    [() => attachedPoliciesListType, 2, 0]
];
var ListDelegationRequestsRequest$ = [3, n0, _LDRR,
    0,
    [_OI, _Ma, _MI],
    [0, 0, 1]
];
var ListDelegationRequestsResponse$ = [3, n0, _LDRRi,
    0,
    [_DRe, _Ma, _iT],
    [() => delegationRequestsListType, 0, 2]
];
var ListEntitiesForPolicyRequest$ = [3, n0, _LEFPR,
    0,
    [_PA, _EFn, _PPat, _PUF, _Ma, _MI],
    [0, 0, 0, 0, 0, 1], 1
];
var ListEntitiesForPolicyResponse$ = [3, n0, _LEFPRi,
    0,
    [_PG, _PU, _PR, _IT, _Ma],
    [() => PolicyGroupListType, () => PolicyUserListType, () => PolicyRoleListType, 2, 0]
];
var ListGroupPoliciesRequest$ = [3, n0, _LGPR,
    0,
    [_GN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListGroupPoliciesResponse$ = [3, n0, _LGPRi,
    0,
    [_PNo, _IT, _Ma],
    [64 | 0, 2, 0], 1
];
var ListGroupsForUserRequest$ = [3, n0, _LGFUR,
    0,
    [_UN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListGroupsForUserResponse$ = [3, n0, _LGFURi,
    0,
    [_Gro, _IT, _Ma],
    [() => groupListType, 2, 0], 1
];
var ListGroupsRequest$ = [3, n0, _LGR,
    0,
    [_PPat, _Ma, _MI],
    [0, 0, 1]
];
var ListGroupsResponse$ = [3, n0, _LGRi,
    0,
    [_Gro, _IT, _Ma],
    [() => groupListType, 2, 0], 1
];
var ListInstanceProfilesForRoleRequest$ = [3, n0, _LIPFRR,
    0,
    [_RN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListInstanceProfilesForRoleResponse$ = [3, n0, _LIPFRRi,
    0,
    [_IPn, _IT, _Ma],
    [() => instanceProfileListType, 2, 0], 1
];
var ListInstanceProfilesRequest$ = [3, n0, _LIPR,
    0,
    [_PPat, _Ma, _MI],
    [0, 0, 1]
];
var ListInstanceProfilesResponse$ = [3, n0, _LIPRi,
    0,
    [_IPn, _IT, _Ma],
    [() => instanceProfileListType, 2, 0], 1
];
var ListInstanceProfileTagsRequest$ = [3, n0, _LIPTR,
    0,
    [_IPN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListInstanceProfileTagsResponse$ = [3, n0, _LIPTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListMFADevicesRequest$ = [3, n0, _LMFADR,
    0,
    [_UN, _Ma, _MI],
    [0, 0, 1]
];
var ListMFADevicesResponse$ = [3, n0, _LMFADRi,
    0,
    [_MFAD, _IT, _Ma],
    [() => mfaDeviceListType, 2, 0], 1
];
var ListMFADeviceTagsRequest$ = [3, n0, _LMFADTR,
    0,
    [_SNer, _Ma, _MI],
    [0, 0, 1], 1
];
var ListMFADeviceTagsResponse$ = [3, n0, _LMFADTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListOpenIDConnectProvidersRequest$ = [3, n0, _LOIDCPR,
    0,
    [],
    []
];
var ListOpenIDConnectProvidersResponse$ = [3, n0, _LOIDCPRi,
    0,
    [_OIDCPL],
    [() => OpenIDConnectProviderListType]
];
var ListOpenIDConnectProviderTagsRequest$ = [3, n0, _LOIDCPTR,
    0,
    [_OIDCPA, _Ma, _MI],
    [0, 0, 1], 1
];
var ListOpenIDConnectProviderTagsResponse$ = [3, n0, _LOIDCPTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListOrganizationsFeaturesRequest$ = [3, n0, _LOFR,
    0,
    [],
    []
];
var ListOrganizationsFeaturesResponse$ = [3, n0, _LOFRi,
    0,
    [_OIr, _EF],
    [0, 64 | 0]
];
var ListPoliciesGrantingServiceAccessEntry$ = [3, n0, _LPGSAE,
    0,
    [_SNe, _Pol],
    [0, () => policyGrantingServiceAccessListType]
];
var ListPoliciesGrantingServiceAccessRequest$ = [3, n0, _LPGSAR,
    0,
    [_A, _SNerv, _Ma],
    [0, 64 | 0, 0], 2
];
var ListPoliciesGrantingServiceAccessResponse$ = [3, n0, _LPGSARi,
    0,
    [_PGSA, _IT, _Ma],
    [() => listPolicyGrantingServiceAccessResponseListType, 2, 0], 1
];
var ListPoliciesRequest$ = [3, n0, _LPR,
    0,
    [_Sc, _OA, _PPat, _PUF, _Ma, _MI],
    [0, 2, 0, 0, 0, 1]
];
var ListPoliciesResponse$ = [3, n0, _LPRi,
    0,
    [_Pol, _IT, _Ma],
    [() => policyListType, 2, 0]
];
var ListPolicyTagsRequest$ = [3, n0, _LPTR,
    0,
    [_PA, _Ma, _MI],
    [0, 0, 1], 1
];
var ListPolicyTagsResponse$ = [3, n0, _LPTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListPolicyVersionsRequest$ = [3, n0, _LPVR,
    0,
    [_PA, _Ma, _MI],
    [0, 0, 1], 1
];
var ListPolicyVersionsResponse$ = [3, n0, _LPVRi,
    0,
    [_V, _IT, _Ma],
    [() => policyDocumentVersionListType, 2, 0]
];
var ListRolePoliciesRequest$ = [3, n0, _LRPR,
    0,
    [_RN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListRolePoliciesResponse$ = [3, n0, _LRPRi,
    0,
    [_PNo, _IT, _Ma],
    [64 | 0, 2, 0], 1
];
var ListRolesRequest$ = [3, n0, _LRR,
    0,
    [_PPat, _Ma, _MI],
    [0, 0, 1]
];
var ListRolesResponse$ = [3, n0, _LRRi,
    0,
    [_Rol, _IT, _Ma],
    [() => roleListType, 2, 0], 1
];
var ListRoleTagsRequest$ = [3, n0, _LRTR,
    0,
    [_RN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListRoleTagsResponse$ = [3, n0, _LRTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListSAMLProvidersRequest$ = [3, n0, _LSAMLPR,
    0,
    [],
    []
];
var ListSAMLProvidersResponse$ = [3, n0, _LSAMLPRi,
    0,
    [_SAMLPL],
    [() => SAMLProviderListType]
];
var ListSAMLProviderTagsRequest$ = [3, n0, _LSAMLPTR,
    0,
    [_SAMLPA, _Ma, _MI],
    [0, 0, 1], 1
];
var ListSAMLProviderTagsResponse$ = [3, n0, _LSAMLPTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListServerCertificatesRequest$ = [3, n0, _LSCR,
    0,
    [_PPat, _Ma, _MI],
    [0, 0, 1]
];
var ListServerCertificatesResponse$ = [3, n0, _LSCRi,
    0,
    [_SCML, _IT, _Ma],
    [() => serverCertificateMetadataListType, 2, 0], 1
];
var ListServerCertificateTagsRequest$ = [3, n0, _LSCTR,
    0,
    [_SCN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListServerCertificateTagsResponse$ = [3, n0, _LSCTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListServiceSpecificCredentialsRequest$ = [3, n0, _LSSCR,
    0,
    [_UN, _SN, _AU, _Ma, _MI],
    [0, 0, 2, 0, 1]
];
var ListServiceSpecificCredentialsResponse$ = [3, n0, _LSSCRi,
    0,
    [_SSCe, _Ma, _IT],
    [() => ServiceSpecificCredentialsListType, 0, 2]
];
var ListSigningCertificatesRequest$ = [3, n0, _LSCRis,
    0,
    [_UN, _Ma, _MI],
    [0, 0, 1]
];
var ListSigningCertificatesResponse$ = [3, n0, _LSCRist,
    0,
    [_Cer, _IT, _Ma],
    [() => certificateListType, 2, 0], 1
];
var ListSSHPublicKeysRequest$ = [3, n0, _LSSHPKR,
    0,
    [_UN, _Ma, _MI],
    [0, 0, 1]
];
var ListSSHPublicKeysResponse$ = [3, n0, _LSSHPKRi,
    0,
    [_SSHPKu, _IT, _Ma],
    [() => SSHPublicKeyListType, 2, 0]
];
var ListUserPoliciesRequest$ = [3, n0, _LUPR,
    0,
    [_UN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListUserPoliciesResponse$ = [3, n0, _LUPRi,
    0,
    [_PNo, _IT, _Ma],
    [64 | 0, 2, 0], 1
];
var ListUsersRequest$ = [3, n0, _LUR,
    0,
    [_PPat, _Ma, _MI],
    [0, 0, 1]
];
var ListUsersResponse$ = [3, n0, _LURi,
    0,
    [_Use, _IT, _Ma],
    [() => userListType, 2, 0], 1
];
var ListUserTagsRequest$ = [3, n0, _LUTR,
    0,
    [_UN, _Ma, _MI],
    [0, 0, 1], 1
];
var ListUserTagsResponse$ = [3, n0, _LUTRi,
    0,
    [_T, _IT, _Ma],
    [() => tagListType, 2, 0], 1
];
var ListVirtualMFADevicesRequest$ = [3, n0, _LVMFADR,
    0,
    [_AS, _Ma, _MI],
    [0, 0, 1]
];
var ListVirtualMFADevicesResponse$ = [3, n0, _LVMFADRi,
    0,
    [_VMFADi, _IT, _Ma],
    [[() => virtualMFADeviceListType, 0], 2, 0], 1
];
var LoginProfile$ = [3, n0, _LP,
    0,
    [_UN, _CD, _PRR],
    [0, 4, 2], 2
];
var MalformedCertificateException$ = [-3, n0, _MCE,
    { [_aQE]: [`MalformedCertificate`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(MalformedCertificateException$, MalformedCertificateException);
var MalformedPolicyDocumentException$ = [-3, n0, _MPDE,
    { [_aQE]: [`MalformedPolicyDocument`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(MalformedPolicyDocumentException$, MalformedPolicyDocumentException);
var ManagedPolicyDetail$ = [3, n0, _MPD,
    0,
    [_PN, _PI, _A, _Pa, _DVI, _ACt, _PBUC, _IA, _D, _CD, _UD, _PVL],
    [0, 0, 0, 0, 0, 1, 1, 2, 0, 4, 4, () => policyDocumentVersionListType]
];
var MFADevice$ = [3, n0, _MFADe,
    0,
    [_UN, _SNer, _EDn],
    [0, 0, 4], 3
];
var NoSuchEntityException$ = [-3, n0, _NSEE,
    { [_aQE]: [`NoSuchEntity`, 404], [_e]: _c, [_hE]: 404 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(NoSuchEntityException$, NoSuchEntityException);
var OpenIDConnectProviderListEntry$ = [3, n0, _OIDCPLE,
    0,
    [_A],
    [0]
];
var OpenIdIdpCommunicationErrorException$ = [-3, n0, _OIICEE,
    { [_aQE]: [`OpenIdIdpCommunicationError`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(OpenIdIdpCommunicationErrorException$, OpenIdIdpCommunicationErrorException);
var OrganizationNotFoundException$ = [-3, n0, _ONFE,
    { [_e]: _c, [_hE]: 400 },
    [_M],
    [0]
];
schema.TypeRegistry.for(n0).registerError(OrganizationNotFoundException$, OrganizationNotFoundException);
var OrganizationNotInAllFeaturesModeException$ = [-3, n0, _ONIAFME,
    { [_e]: _c, [_hE]: 400 },
    [_M],
    [0]
];
schema.TypeRegistry.for(n0).registerError(OrganizationNotInAllFeaturesModeException$, OrganizationNotInAllFeaturesModeException);
var OrganizationsDecisionDetail$ = [3, n0, _ODD,
    0,
    [_ABO],
    [2]
];
var PasswordPolicy$ = [3, n0, _PPa,
    0,
    [_MPL, _RS, _RNeq, _RUC, _RLC, _AUTCP, _EPx, _MPA, _PRP, _HE],
    [1, 2, 2, 2, 2, 2, 2, 1, 1, 2]
];
var PasswordPolicyViolationException$ = [-3, n0, _PPVE,
    { [_aQE]: [`PasswordPolicyViolation`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(PasswordPolicyViolationException$, PasswordPolicyViolationException);
var PermissionsBoundaryDecisionDetail$ = [3, n0, _PBDD,
    0,
    [_ABPB],
    [2]
];
var Policy$ = [3, n0, _Po,
    0,
    [_PN, _PI, _A, _Pa, _DVI, _ACt, _PBUC, _IA, _D, _CD, _UD, _T],
    [0, 0, 0, 0, 0, 1, 1, 2, 0, 4, 4, () => tagListType]
];
var PolicyDetail$ = [3, n0, _PDo,
    0,
    [_PN, _PD],
    [0, 0]
];
var PolicyEvaluationException$ = [-3, n0, _PEE,
    { [_aQE]: [`PolicyEvaluation`, 500], [_e]: _s, [_hE]: 500 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(PolicyEvaluationException$, PolicyEvaluationException);
var PolicyGrantingServiceAccess$ = [3, n0, _PGSAo,
    0,
    [_PN, _PT, _PA, _ETn, _EN],
    [0, 0, 0, 0, 0], 2
];
var PolicyGroup$ = [3, n0, _PGo,
    0,
    [_GN, _GI],
    [0, 0]
];
var PolicyNotAttachableException$ = [-3, n0, _PNAE,
    { [_aQE]: [`PolicyNotAttachable`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(PolicyNotAttachableException$, PolicyNotAttachableException);
var PolicyParameter$ = [3, n0, _PPo,
    0,
    [_N, _Va, _Ty],
    [0, 64 | 0, 0]
];
var PolicyRole$ = [3, n0, _PRo,
    0,
    [_RN, _RIo],
    [0, 0]
];
var PolicyUser$ = [3, n0, _PUo,
    0,
    [_UN, _UI],
    [0, 0]
];
var PolicyVersion$ = [3, n0, _PV,
    0,
    [_Do, _VI, _IDV, _CD],
    [0, 0, 2, 4]
];
var Position$ = [3, n0, _Pos,
    0,
    [_Li, _Col],
    [1, 1]
];
var PutGroupPolicyRequest$ = [3, n0, _PGPR,
    0,
    [_GN, _PN, _PD],
    [0, 0, 0], 3
];
var PutRolePermissionsBoundaryRequest$ = [3, n0, _PRPBR,
    0,
    [_RN, _PB],
    [0, 0], 2
];
var PutRolePolicyRequest$ = [3, n0, _PRPR,
    0,
    [_RN, _PN, _PD],
    [0, 0, 0], 3
];
var PutUserPermissionsBoundaryRequest$ = [3, n0, _PUPBR,
    0,
    [_UN, _PB],
    [0, 0], 2
];
var PutUserPolicyRequest$ = [3, n0, _PUPR,
    0,
    [_UN, _PN, _PD],
    [0, 0, 0], 3
];
var RejectDelegationRequestRequest$ = [3, n0, _RDRR,
    0,
    [_DRI, _No],
    [0, 0], 1
];
var RemoveClientIDFromOpenIDConnectProviderRequest$ = [3, n0, _RCIDFOIDCPR,
    0,
    [_OIDCPA, _CID],
    [0, 0], 2
];
var RemoveRoleFromInstanceProfileRequest$ = [3, n0, _RRFIPR,
    0,
    [_IPN, _RN],
    [0, 0], 2
];
var RemoveUserFromGroupRequest$ = [3, n0, _RUFGR,
    0,
    [_GN, _UN],
    [0, 0], 2
];
var ReportGenerationLimitExceededException$ = [-3, n0, _RGLEE,
    { [_aQE]: [`ReportGenerationLimitExceeded`, 409], [_e]: _c, [_hE]: 409 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(ReportGenerationLimitExceededException$, ReportGenerationLimitExceededException);
var ResetServiceSpecificCredentialRequest$ = [3, n0, _RSSCR,
    0,
    [_SSCI, _UN],
    [0, 0], 1
];
var ResetServiceSpecificCredentialResponse$ = [3, n0, _RSSCRe,
    0,
    [_SSC],
    [[() => ServiceSpecificCredential$, 0]]
];
var ResourceSpecificResult$ = [3, n0, _RSRe,
    0,
    [_ERN, _ERD, _MS, _MCV, _EDD, _PBDD],
    [0, 0, () => StatementListType, 64 | 0, 128 | 0, () => PermissionsBoundaryDecisionDetail$], 2
];
var ResyncMFADeviceRequest$ = [3, n0, _RMFADR,
    0,
    [_UN, _SNer, _AC, _ACu],
    [0, 0, 0, 0], 4
];
var Role$ = [3, n0, _Ro,
    0,
    [_Pa, _RN, _RIo, _A, _CD, _ARPD, _D, _MSD, _PB, _T, _RLU],
    [0, 0, 0, 0, 4, 0, 0, 1, () => AttachedPermissionsBoundary$, () => tagListType, () => RoleLastUsed$], 5
];
var RoleDetail$ = [3, n0, _RD,
    0,
    [_Pa, _RN, _RIo, _A, _CD, _ARPD, _IPL, _RPL, _AMP, _PB, _T, _RLU],
    [0, 0, 0, 0, 4, 0, () => instanceProfileListType, () => policyDetailListType, () => attachedPoliciesListType, () => AttachedPermissionsBoundary$, () => tagListType, () => RoleLastUsed$]
];
var RoleLastUsed$ = [3, n0, _RLU,
    0,
    [_LUD, _R],
    [4, 0]
];
var RoleUsageType$ = [3, n0, _RUT,
    0,
    [_R, _Res],
    [0, 64 | 0]
];
var SAMLPrivateKey$ = [3, n0, _SAMLPK,
    0,
    [_KI, _Ti],
    [0, 4]
];
var SAMLProviderListEntry$ = [3, n0, _SAMLPLE,
    0,
    [_A, _VU, _CD],
    [0, 4, 4]
];
var SendDelegationTokenRequest$ = [3, n0, _SDTR,
    0,
    [_DRI],
    [0], 1
];
var ServerCertificate$ = [3, n0, _SCe,
    0,
    [_SCM, _CB, _CC, _T],
    [() => ServerCertificateMetadata$, 0, 0, () => tagListType], 2
];
var ServerCertificateMetadata$ = [3, n0, _SCM,
    0,
    [_Pa, _SCN, _SCI, _A, _UDp, _Ex],
    [0, 0, 0, 0, 4, 4], 4
];
var ServiceAccessNotEnabledException$ = [-3, n0, _SANEE,
    { [_e]: _c, [_hE]: 400 },
    [_M],
    [0]
];
schema.TypeRegistry.for(n0).registerError(ServiceAccessNotEnabledException$, ServiceAccessNotEnabledException);
var ServiceFailureException$ = [-3, n0, _SFE,
    { [_aQE]: [`ServiceFailure`, 500], [_e]: _s, [_hE]: 500 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(ServiceFailureException$, ServiceFailureException);
var ServiceLastAccessed$ = [3, n0, _SLAe,
    0,
    [_SN, _SNe, _LA, _LAE, _LAR, _TAE, _TALA],
    [0, 0, 4, 0, 0, 1, () => TrackedActionsLastAccessed], 2
];
var ServiceNotSupportedException$ = [-3, n0, _SNSE,
    { [_aQE]: [`NotSupportedService`, 404], [_e]: _c, [_hE]: 404 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(ServiceNotSupportedException$, ServiceNotSupportedException);
var ServiceSpecificCredential$ = [3, n0, _SSC,
    0,
    [_CD, _SN, _SSCI, _UN, _S, _EDx, _SUN, _SP, _SCA, _SCS],
    [4, 0, 0, 0, 0, 4, 0, [() => servicePassword, 0], 0, [() => serviceCredentialSecret, 0]], 5
];
var ServiceSpecificCredentialMetadata$ = [3, n0, _SSCM,
    0,
    [_UN, _S, _CD, _SSCI, _SN, _SUN, _SCA, _EDx],
    [0, 0, 4, 0, 0, 0, 0, 4], 5
];
var SetDefaultPolicyVersionRequest$ = [3, n0, _SDPVR,
    0,
    [_PA, _VI],
    [0, 0], 2
];
var SetSecurityTokenServicePreferencesRequest$ = [3, n0, _SSTSPR,
    0,
    [_GETV],
    [0], 1
];
var SigningCertificate$ = [3, n0, _SCi,
    0,
    [_UN, _CI, _CB, _S, _UDp],
    [0, 0, 0, 0, 4], 4
];
var SimulateCustomPolicyRequest$ = [3, n0, _SCPR,
    0,
    [_PIL, _AN, _PBPIL, _RA, _RP, _RO, _CA, _CEo, _RHO, _MI, _Ma],
    [64 | 0, 64 | 0, 64 | 0, 64 | 0, 0, 0, 0, () => ContextEntryListType, 0, 1, 0], 2
];
var SimulatePolicyResponse$ = [3, n0, _SPR,
    0,
    [_ERv, _IT, _Ma],
    [() => EvaluationResultsListType, 2, 0]
];
var SimulatePrincipalPolicyRequest$ = [3, n0, _SPPR,
    0,
    [_PSA, _AN, _PIL, _PBPIL, _RA, _RP, _RO, _CA, _CEo, _RHO, _MI, _Ma],
    [0, 64 | 0, 64 | 0, 64 | 0, 64 | 0, 0, 0, 0, () => ContextEntryListType, 0, 1, 0], 2
];
var SSHPublicKey$ = [3, n0, _SSHPK,
    0,
    [_UN, _SSHPKI, _Fi, _SSHPKB, _S, _UDp],
    [0, 0, 0, 0, 0, 4], 5
];
var SSHPublicKeyMetadata$ = [3, n0, _SSHPKM,
    0,
    [_UN, _SSHPKI, _S, _UDp],
    [0, 0, 0, 4], 4
];
var Statement$ = [3, n0, _Sta,
    0,
    [_SPI, _SPT, _SPt, _EPn],
    [0, 0, () => Position$, () => Position$]
];
var Tag$ = [3, n0, _Ta,
    0,
    [_K, _Val],
    [0, 0], 2
];
var TagInstanceProfileRequest$ = [3, n0, _TIPR,
    0,
    [_IPN, _T],
    [0, () => tagListType], 2
];
var TagMFADeviceRequest$ = [3, n0, _TMFADR,
    0,
    [_SNer, _T],
    [0, () => tagListType], 2
];
var TagOpenIDConnectProviderRequest$ = [3, n0, _TOIDCPR,
    0,
    [_OIDCPA, _T],
    [0, () => tagListType], 2
];
var TagPolicyRequest$ = [3, n0, _TPR,
    0,
    [_PA, _T],
    [0, () => tagListType], 2
];
var TagRoleRequest$ = [3, n0, _TRR,
    0,
    [_RN, _T],
    [0, () => tagListType], 2
];
var TagSAMLProviderRequest$ = [3, n0, _TSAMLPR,
    0,
    [_SAMLPA, _T],
    [0, () => tagListType], 2
];
var TagServerCertificateRequest$ = [3, n0, _TSCR,
    0,
    [_SCN, _T],
    [0, () => tagListType], 2
];
var TagUserRequest$ = [3, n0, _TUR,
    0,
    [_UN, _T],
    [0, () => tagListType], 2
];
var TrackedActionLastAccessed$ = [3, n0, _TALAr,
    0,
    [_ANc, _LAEa, _LATa, _LARa],
    [0, 0, 4, 0]
];
var UnmodifiableEntityException$ = [-3, n0, _UEE,
    { [_aQE]: [`UnmodifiableEntity`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(UnmodifiableEntityException$, UnmodifiableEntityException);
var UnrecognizedPublicKeyEncodingException$ = [-3, n0, _UPKEE,
    { [_aQE]: [`UnrecognizedPublicKeyEncoding`, 400], [_e]: _c, [_hE]: 400 },
    [_m],
    [0]
];
schema.TypeRegistry.for(n0).registerError(UnrecognizedPublicKeyEncodingException$, UnrecognizedPublicKeyEncodingException);
var UntagInstanceProfileRequest$ = [3, n0, _UIPR,
    0,
    [_IPN, _TK],
    [0, 64 | 0], 2
];
var UntagMFADeviceRequest$ = [3, n0, _UMFADR,
    0,
    [_SNer, _TK],
    [0, 64 | 0], 2
];
var UntagOpenIDConnectProviderRequest$ = [3, n0, _UOIDCPR,
    0,
    [_OIDCPA, _TK],
    [0, 64 | 0], 2
];
var UntagPolicyRequest$ = [3, n0, _UPR,
    0,
    [_PA, _TK],
    [0, 64 | 0], 2
];
var UntagRoleRequest$ = [3, n0, _URR,
    0,
    [_RN, _TK],
    [0, 64 | 0], 2
];
var UntagSAMLProviderRequest$ = [3, n0, _USAMLPR,
    0,
    [_SAMLPA, _TK],
    [0, 64 | 0], 2
];
var UntagServerCertificateRequest$ = [3, n0, _USCR,
    0,
    [_SCN, _TK],
    [0, 64 | 0], 2
];
var UntagUserRequest$ = [3, n0, _UUR,
    0,
    [_UN, _TK],
    [0, 64 | 0], 2
];
var UpdateAccessKeyRequest$ = [3, n0, _UAKR,
    0,
    [_AKI, _S, _UN],
    [0, 0, 0], 2
];
var UpdateAccountPasswordPolicyRequest$ = [3, n0, _UAPPR,
    0,
    [_MPL, _RS, _RNeq, _RUC, _RLC, _AUTCP, _MPA, _PRP, _HE],
    [1, 2, 2, 2, 2, 2, 1, 1, 2]
];
var UpdateAssumeRolePolicyRequest$ = [3, n0, _UARPR,
    0,
    [_RN, _PD],
    [0, 0], 2
];
var UpdateDelegationRequestRequest$ = [3, n0, _UDRR,
    0,
    [_DRI, _No],
    [0, 0], 1
];
var UpdateGroupRequest$ = [3, n0, _UGR,
    0,
    [_GN, _NPe, _NGN],
    [0, 0, 0], 1
];
var UpdateLoginProfileRequest$ = [3, n0, _ULPR,
    0,
    [_UN, _Pas, _PRR],
    [0, [() => passwordType, 0], 2], 1
];
var UpdateOpenIDConnectProviderThumbprintRequest$ = [3, n0, _UOIDCPTR,
    0,
    [_OIDCPA, _TL],
    [0, 64 | 0], 2
];
var UpdateRoleDescriptionRequest$ = [3, n0, _URDR,
    0,
    [_RN, _D],
    [0, 0], 2
];
var UpdateRoleDescriptionResponse$ = [3, n0, _URDRp,
    0,
    [_Ro],
    [() => Role$]
];
var UpdateRoleRequest$ = [3, n0, _URRp,
    0,
    [_RN, _D, _MSD],
    [0, 0, 1], 1
];
var UpdateRoleResponse$ = [3, n0, _URRpd,
    0,
    [],
    []
];
var UpdateSAMLProviderRequest$ = [3, n0, _USAMLPRp,
    0,
    [_SAMLPA, _SAMLMD, _AEM, _APK, _RPK],
    [0, 0, 0, [() => privateKeyType, 0], 0], 1
];
var UpdateSAMLProviderResponse$ = [3, n0, _USAMLPRpd,
    0,
    [_SAMLPA],
    [0]
];
var UpdateServerCertificateRequest$ = [3, n0, _USCRp,
    0,
    [_SCN, _NPe, _NSCN],
    [0, 0, 0], 1
];
var UpdateServiceSpecificCredentialRequest$ = [3, n0, _USSCR,
    0,
    [_SSCI, _S, _UN],
    [0, 0, 0], 2
];
var UpdateSigningCertificateRequest$ = [3, n0, _USCRpd,
    0,
    [_CI, _S, _UN],
    [0, 0, 0], 2
];
var UpdateSSHPublicKeyRequest$ = [3, n0, _USSHPKR,
    0,
    [_UN, _SSHPKI, _S],
    [0, 0, 0], 3
];
var UpdateUserRequest$ = [3, n0, _UURp,
    0,
    [_UN, _NPe, _NUN],
    [0, 0, 0], 1
];
var UploadServerCertificateRequest$ = [3, n0, _USCRpl,
    0,
    [_SCN, _CB, _PK, _Pa, _CC, _T],
    [0, 0, [() => privateKeyType, 0], 0, 0, () => tagListType], 3
];
var UploadServerCertificateResponse$ = [3, n0, _USCRplo,
    0,
    [_SCM, _T],
    [() => ServerCertificateMetadata$, () => tagListType]
];
var UploadSigningCertificateRequest$ = [3, n0, _USCRploa,
    0,
    [_CB, _UN],
    [0, 0], 1
];
var UploadSigningCertificateResponse$ = [3, n0, _USCRpload,
    0,
    [_Cert],
    [() => SigningCertificate$], 1
];
var UploadSSHPublicKeyRequest$ = [3, n0, _USSHPKRp,
    0,
    [_UN, _SSHPKB],
    [0, 0], 2
];
var UploadSSHPublicKeyResponse$ = [3, n0, _USSHPKRpl,
    0,
    [_SSHPK],
    [() => SSHPublicKey$]
];
var User$ = [3, n0, _Us,
    0,
    [_Pa, _UN, _UI, _A, _CD, _PLU, _PB, _T],
    [0, 0, 0, 0, 4, 4, () => AttachedPermissionsBoundary$, () => tagListType], 5
];
var UserDetail$ = [3, n0, _UDs,
    0,
    [_Pa, _UN, _UI, _A, _CD, _UPL, _GL, _AMP, _PB, _T],
    [0, 0, 0, 0, 4, () => policyDetailListType, 64 | 0, () => attachedPoliciesListType, () => AttachedPermissionsBoundary$, () => tagListType]
];
var VirtualMFADevice$ = [3, n0, _VMFAD,
    0,
    [_SNer, _BSS, _QRCPNG, _Us, _EDn, _T],
    [0, [() => BootstrapDatum, 0], [() => BootstrapDatum, 0], () => User$, 4, () => tagListType], 1
];
var __Unit = "unit";
var IAMServiceException$ = [-3, _sm, "IAMServiceException", 0, [], []];
schema.TypeRegistry.for(_sm).registerError(IAMServiceException$, IAMServiceException);
var AccessDetails = [1, n0, _ADc,
    0, () => AccessDetail$
];
var accessKeyMetadataListType = [1, n0, _aKMLT,
    0, () => AccessKeyMetadata$
];
var attachedPoliciesListType = [1, n0, _aPLT,
    0, () => AttachedPolicy$
];
var certificateListType = [1, n0, _cLT,
    0, () => SigningCertificate$
];
var ContextEntryListType = [1, n0, _CELT,
    0, () => ContextEntry$
];
var delegationRequestsListType = [1, n0, _dRLT,
    0, () => DelegationRequest$
];
var entityDetailsListType = [1, n0, _eDLT,
    0, () => EntityDetails$
];
var EvaluationResultsListType = [1, n0, _ERLT,
    0, () => EvaluationResult$
];
var groupDetailListType = [1, n0, _gDLT,
    0, () => GroupDetail$
];
var groupListType = [1, n0, _gLT,
    0, () => Group$
];
var instanceProfileListType = [1, n0, _iPLT,
    0, () => InstanceProfile$
];
var listPolicyGrantingServiceAccessResponseListType = [1, n0, _lPGSARLT,
    0, () => ListPoliciesGrantingServiceAccessEntry$
];
var ManagedPolicyDetailListType = [1, n0, _MPDLT,
    0, () => ManagedPolicyDetail$
];
var mfaDeviceListType = [1, n0, _mDLT,
    0, () => MFADevice$
];
var OpenIDConnectProviderListType = [1, n0, _OIDCPLT,
    0, () => OpenIDConnectProviderListEntry$
];
var policyDetailListType = [1, n0, _pDLT,
    0, () => PolicyDetail$
];
var policyDocumentVersionListType = [1, n0, _pDVLT,
    0, () => PolicyVersion$
];
var policyGrantingServiceAccessListType = [1, n0, _pGSALT,
    0, () => PolicyGrantingServiceAccess$
];
var PolicyGroupListType = [1, n0, _PGLT,
    0, () => PolicyGroup$
];
var policyListType = [1, n0, _pLT,
    0, () => Policy$
];
var policyParameterListType = [1, n0, _pPLT,
    0, () => PolicyParameter$
];
var PolicyRoleListType = [1, n0, _PRLT,
    0, () => PolicyRole$
];
var PolicyUserListType = [1, n0, _PULT,
    0, () => PolicyUser$
];
var privateKeyList = [1, n0, _pKL,
    0, () => SAMLPrivateKey$
];
var ResourceSpecificResultListType = [1, n0, _RSRLT,
    0, () => ResourceSpecificResult$
];
var roleDetailListType = [1, n0, _rDLT,
    0, () => RoleDetail$
];
var roleListType = [1, n0, _rLT,
    0, () => Role$
];
var RoleUsageListType = [1, n0, _RULT,
    0, () => RoleUsageType$
];
var SAMLProviderListType = [1, n0, _SAMLPLT,
    0, () => SAMLProviderListEntry$
];
var serverCertificateMetadataListType = [1, n0, _sCMLT,
    0, () => ServerCertificateMetadata$
];
var ServicesLastAccessed = [1, n0, _SLA,
    0, () => ServiceLastAccessed$
];
var ServiceSpecificCredentialsListType = [1, n0, _SSCLT,
    0, () => ServiceSpecificCredentialMetadata$
];
var SSHPublicKeyListType = [1, n0, _SSHPKLT,
    0, () => SSHPublicKeyMetadata$
];
var StatementListType = [1, n0, _SLT,
    0, () => Statement$
];
var tagListType = [1, n0, _tLT,
    0, () => Tag$
];
var TrackedActionsLastAccessed = [1, n0, _TALA,
    0, () => TrackedActionLastAccessed$
];
var userDetailListType = [1, n0, _uDLT,
    0, () => UserDetail$
];
var userListType = [1, n0, _uLT,
    0, () => User$
];
var virtualMFADeviceListType = [1, n0, _vMFADLT,
    0, [() => VirtualMFADevice$,
        0]
];
var AcceptDelegationRequest$ = [9, n0, _ADR,
    0, () => AcceptDelegationRequestRequest$, () => __Unit
];
var AddClientIDToOpenIDConnectProvider$ = [9, n0, _ACIDTOIDCP,
    0, () => AddClientIDToOpenIDConnectProviderRequest$, () => __Unit
];
var AddRoleToInstanceProfile$ = [9, n0, _ARTIP,
    0, () => AddRoleToInstanceProfileRequest$, () => __Unit
];
var AddUserToGroup$ = [9, n0, _AUTG,
    0, () => AddUserToGroupRequest$, () => __Unit
];
var AssociateDelegationRequest$ = [9, n0, _ADRs,
    0, () => AssociateDelegationRequestRequest$, () => __Unit
];
var AttachGroupPolicy$ = [9, n0, _AGP,
    0, () => AttachGroupPolicyRequest$, () => __Unit
];
var AttachRolePolicy$ = [9, n0, _ARP,
    0, () => AttachRolePolicyRequest$, () => __Unit
];
var AttachUserPolicy$ = [9, n0, _AUP,
    0, () => AttachUserPolicyRequest$, () => __Unit
];
var ChangePassword$ = [9, n0, _CP,
    0, () => ChangePasswordRequest$, () => __Unit
];
var CreateAccessKey$ = [9, n0, _CAK,
    0, () => CreateAccessKeyRequest$, () => CreateAccessKeyResponse$
];
var CreateAccountAlias$ = [9, n0, _CAA,
    0, () => CreateAccountAliasRequest$, () => __Unit
];
var CreateDelegationRequest$ = [9, n0, _CDR,
    0, () => CreateDelegationRequestRequest$, () => CreateDelegationRequestResponse$
];
var CreateGroup$ = [9, n0, _CG,
    0, () => CreateGroupRequest$, () => CreateGroupResponse$
];
var CreateInstanceProfile$ = [9, n0, _CIP,
    0, () => CreateInstanceProfileRequest$, () => CreateInstanceProfileResponse$
];
var CreateLoginProfile$ = [9, n0, _CLP,
    0, () => CreateLoginProfileRequest$, () => CreateLoginProfileResponse$
];
var CreateOpenIDConnectProvider$ = [9, n0, _COIDCP,
    0, () => CreateOpenIDConnectProviderRequest$, () => CreateOpenIDConnectProviderResponse$
];
var CreatePolicy$ = [9, n0, _CPr,
    0, () => CreatePolicyRequest$, () => CreatePolicyResponse$
];
var CreatePolicyVersion$ = [9, n0, _CPV,
    0, () => CreatePolicyVersionRequest$, () => CreatePolicyVersionResponse$
];
var CreateRole$ = [9, n0, _CR,
    0, () => CreateRoleRequest$, () => CreateRoleResponse$
];
var CreateSAMLProvider$ = [9, n0, _CSAMLP,
    0, () => CreateSAMLProviderRequest$, () => CreateSAMLProviderResponse$
];
var CreateServiceLinkedRole$ = [9, n0, _CSLR,
    0, () => CreateServiceLinkedRoleRequest$, () => CreateServiceLinkedRoleResponse$
];
var CreateServiceSpecificCredential$ = [9, n0, _CSSC,
    0, () => CreateServiceSpecificCredentialRequest$, () => CreateServiceSpecificCredentialResponse$
];
var CreateUser$ = [9, n0, _CU,
    0, () => CreateUserRequest$, () => CreateUserResponse$
];
var CreateVirtualMFADevice$ = [9, n0, _CVMFAD,
    0, () => CreateVirtualMFADeviceRequest$, () => CreateVirtualMFADeviceResponse$
];
var DeactivateMFADevice$ = [9, n0, _DMFAD,
    0, () => DeactivateMFADeviceRequest$, () => __Unit
];
var DeleteAccessKey$ = [9, n0, _DAK,
    0, () => DeleteAccessKeyRequest$, () => __Unit
];
var DeleteAccountAlias$ = [9, n0, _DAA,
    0, () => DeleteAccountAliasRequest$, () => __Unit
];
var DeleteAccountPasswordPolicy$ = [9, n0, _DAPP,
    0, () => __Unit, () => __Unit
];
var DeleteGroup$ = [9, n0, _DG,
    0, () => DeleteGroupRequest$, () => __Unit
];
var DeleteGroupPolicy$ = [9, n0, _DGP,
    0, () => DeleteGroupPolicyRequest$, () => __Unit
];
var DeleteInstanceProfile$ = [9, n0, _DIP,
    0, () => DeleteInstanceProfileRequest$, () => __Unit
];
var DeleteLoginProfile$ = [9, n0, _DLP,
    0, () => DeleteLoginProfileRequest$, () => __Unit
];
var DeleteOpenIDConnectProvider$ = [9, n0, _DOIDCP,
    0, () => DeleteOpenIDConnectProviderRequest$, () => __Unit
];
var DeletePolicy$ = [9, n0, _DPe,
    0, () => DeletePolicyRequest$, () => __Unit
];
var DeletePolicyVersion$ = [9, n0, _DPV,
    0, () => DeletePolicyVersionRequest$, () => __Unit
];
var DeleteRole$ = [9, n0, _DRel,
    0, () => DeleteRoleRequest$, () => __Unit
];
var DeleteRolePermissionsBoundary$ = [9, n0, _DRPB,
    0, () => DeleteRolePermissionsBoundaryRequest$, () => __Unit
];
var DeleteRolePolicy$ = [9, n0, _DRP,
    0, () => DeleteRolePolicyRequest$, () => __Unit
];
var DeleteSAMLProvider$ = [9, n0, _DSAMLP,
    0, () => DeleteSAMLProviderRequest$, () => __Unit
];
var DeleteServerCertificate$ = [9, n0, _DSC,
    0, () => DeleteServerCertificateRequest$, () => __Unit
];
var DeleteServiceLinkedRole$ = [9, n0, _DSLR,
    0, () => DeleteServiceLinkedRoleRequest$, () => DeleteServiceLinkedRoleResponse$
];
var DeleteServiceSpecificCredential$ = [9, n0, _DSSC,
    0, () => DeleteServiceSpecificCredentialRequest$, () => __Unit
];
var DeleteSigningCertificate$ = [9, n0, _DSCe,
    0, () => DeleteSigningCertificateRequest$, () => __Unit
];
var DeleteSSHPublicKey$ = [9, n0, _DSSHPK,
    0, () => DeleteSSHPublicKeyRequest$, () => __Unit
];
var DeleteUser$ = [9, n0, _DU,
    0, () => DeleteUserRequest$, () => __Unit
];
var DeleteUserPermissionsBoundary$ = [9, n0, _DUPB,
    0, () => DeleteUserPermissionsBoundaryRequest$, () => __Unit
];
var DeleteUserPolicy$ = [9, n0, _DUP,
    0, () => DeleteUserPolicyRequest$, () => __Unit
];
var DeleteVirtualMFADevice$ = [9, n0, _DVMFAD,
    0, () => DeleteVirtualMFADeviceRequest$, () => __Unit
];
var DetachGroupPolicy$ = [9, n0, _DGPe,
    0, () => DetachGroupPolicyRequest$, () => __Unit
];
var DetachRolePolicy$ = [9, n0, _DRPe,
    0, () => DetachRolePolicyRequest$, () => __Unit
];
var DetachUserPolicy$ = [9, n0, _DUPe,
    0, () => DetachUserPolicyRequest$, () => __Unit
];
var DisableOrganizationsRootCredentialsManagement$ = [9, n0, _DORCM,
    0, () => DisableOrganizationsRootCredentialsManagementRequest$, () => DisableOrganizationsRootCredentialsManagementResponse$
];
var DisableOrganizationsRootSessions$ = [9, n0, _DORS,
    0, () => DisableOrganizationsRootSessionsRequest$, () => DisableOrganizationsRootSessionsResponse$
];
var DisableOutboundWebIdentityFederation$ = [9, n0, _DOWIF,
    0, () => __Unit, () => __Unit
];
var EnableMFADevice$ = [9, n0, _EMFAD,
    0, () => EnableMFADeviceRequest$, () => __Unit
];
var EnableOrganizationsRootCredentialsManagement$ = [9, n0, _EORCM,
    0, () => EnableOrganizationsRootCredentialsManagementRequest$, () => EnableOrganizationsRootCredentialsManagementResponse$
];
var EnableOrganizationsRootSessions$ = [9, n0, _EORS,
    0, () => EnableOrganizationsRootSessionsRequest$, () => EnableOrganizationsRootSessionsResponse$
];
var EnableOutboundWebIdentityFederation$ = [9, n0, _EOWIF,
    0, () => __Unit, () => EnableOutboundWebIdentityFederationResponse$
];
var GenerateCredentialReport$ = [9, n0, _GCR,
    0, () => __Unit, () => GenerateCredentialReportResponse$
];
var GenerateOrganizationsAccessReport$ = [9, n0, _GOAR,
    0, () => GenerateOrganizationsAccessReportRequest$, () => GenerateOrganizationsAccessReportResponse$
];
var GenerateServiceLastAccessedDetails$ = [9, n0, _GSLAD,
    0, () => GenerateServiceLastAccessedDetailsRequest$, () => GenerateServiceLastAccessedDetailsResponse$
];
var GetAccessKeyLastUsed$ = [9, n0, _GAKLU,
    0, () => GetAccessKeyLastUsedRequest$, () => GetAccessKeyLastUsedResponse$
];
var GetAccountAuthorizationDetails$ = [9, n0, _GAAD,
    0, () => GetAccountAuthorizationDetailsRequest$, () => GetAccountAuthorizationDetailsResponse$
];
var GetAccountPasswordPolicy$ = [9, n0, _GAPP,
    0, () => __Unit, () => GetAccountPasswordPolicyResponse$
];
var GetAccountSummary$ = [9, n0, _GAS,
    0, () => __Unit, () => GetAccountSummaryResponse$
];
var GetContextKeysForCustomPolicy$ = [9, n0, _GCKFCP,
    0, () => GetContextKeysForCustomPolicyRequest$, () => GetContextKeysForPolicyResponse$
];
var GetContextKeysForPrincipalPolicy$ = [9, n0, _GCKFPP,
    0, () => GetContextKeysForPrincipalPolicyRequest$, () => GetContextKeysForPolicyResponse$
];
var GetCredentialReport$ = [9, n0, _GCRe,
    0, () => __Unit, () => GetCredentialReportResponse$
];
var GetDelegationRequest$ = [9, n0, _GDR,
    0, () => GetDelegationRequestRequest$, () => GetDelegationRequestResponse$
];
var GetGroup$ = [9, n0, _GG,
    0, () => GetGroupRequest$, () => GetGroupResponse$
];
var GetGroupPolicy$ = [9, n0, _GGP,
    0, () => GetGroupPolicyRequest$, () => GetGroupPolicyResponse$
];
var GetHumanReadableSummary$ = [9, n0, _GHRS,
    0, () => GetHumanReadableSummaryRequest$, () => GetHumanReadableSummaryResponse$
];
var GetInstanceProfile$ = [9, n0, _GIP,
    0, () => GetInstanceProfileRequest$, () => GetInstanceProfileResponse$
];
var GetLoginProfile$ = [9, n0, _GLP,
    0, () => GetLoginProfileRequest$, () => GetLoginProfileResponse$
];
var GetMFADevice$ = [9, n0, _GMFAD,
    0, () => GetMFADeviceRequest$, () => GetMFADeviceResponse$
];
var GetOpenIDConnectProvider$ = [9, n0, _GOIDCP,
    0, () => GetOpenIDConnectProviderRequest$, () => GetOpenIDConnectProviderResponse$
];
var GetOrganizationsAccessReport$ = [9, n0, _GOARe,
    0, () => GetOrganizationsAccessReportRequest$, () => GetOrganizationsAccessReportResponse$
];
var GetOutboundWebIdentityFederationInfo$ = [9, n0, _GOWIFI,
    0, () => __Unit, () => GetOutboundWebIdentityFederationInfoResponse$
];
var GetPolicy$ = [9, n0, _GP,
    0, () => GetPolicyRequest$, () => GetPolicyResponse$
];
var GetPolicyVersion$ = [9, n0, _GPV,
    0, () => GetPolicyVersionRequest$, () => GetPolicyVersionResponse$
];
var GetRole$ = [9, n0, _GR,
    0, () => GetRoleRequest$, () => GetRoleResponse$
];
var GetRolePolicy$ = [9, n0, _GRP,
    0, () => GetRolePolicyRequest$, () => GetRolePolicyResponse$
];
var GetSAMLProvider$ = [9, n0, _GSAMLP,
    0, () => GetSAMLProviderRequest$, () => GetSAMLProviderResponse$
];
var GetServerCertificate$ = [9, n0, _GSC,
    0, () => GetServerCertificateRequest$, () => GetServerCertificateResponse$
];
var GetServiceLastAccessedDetails$ = [9, n0, _GSLADe,
    0, () => GetServiceLastAccessedDetailsRequest$, () => GetServiceLastAccessedDetailsResponse$
];
var GetServiceLastAccessedDetailsWithEntities$ = [9, n0, _GSLADWE,
    0, () => GetServiceLastAccessedDetailsWithEntitiesRequest$, () => GetServiceLastAccessedDetailsWithEntitiesResponse$
];
var GetServiceLinkedRoleDeletionStatus$ = [9, n0, _GSLRDS,
    0, () => GetServiceLinkedRoleDeletionStatusRequest$, () => GetServiceLinkedRoleDeletionStatusResponse$
];
var GetSSHPublicKey$ = [9, n0, _GSSHPK,
    0, () => GetSSHPublicKeyRequest$, () => GetSSHPublicKeyResponse$
];
var GetUser$ = [9, n0, _GU,
    0, () => GetUserRequest$, () => GetUserResponse$
];
var GetUserPolicy$ = [9, n0, _GUP,
    0, () => GetUserPolicyRequest$, () => GetUserPolicyResponse$
];
var ListAccessKeys$ = [9, n0, _LAK,
    0, () => ListAccessKeysRequest$, () => ListAccessKeysResponse$
];
var ListAccountAliases$ = [9, n0, _LAA,
    0, () => ListAccountAliasesRequest$, () => ListAccountAliasesResponse$
];
var ListAttachedGroupPolicies$ = [9, n0, _LAGP,
    0, () => ListAttachedGroupPoliciesRequest$, () => ListAttachedGroupPoliciesResponse$
];
var ListAttachedRolePolicies$ = [9, n0, _LARP,
    0, () => ListAttachedRolePoliciesRequest$, () => ListAttachedRolePoliciesResponse$
];
var ListAttachedUserPolicies$ = [9, n0, _LAUP,
    0, () => ListAttachedUserPoliciesRequest$, () => ListAttachedUserPoliciesResponse$
];
var ListDelegationRequests$ = [9, n0, _LDR,
    0, () => ListDelegationRequestsRequest$, () => ListDelegationRequestsResponse$
];
var ListEntitiesForPolicy$ = [9, n0, _LEFP,
    0, () => ListEntitiesForPolicyRequest$, () => ListEntitiesForPolicyResponse$
];
var ListGroupPolicies$ = [9, n0, _LGP,
    0, () => ListGroupPoliciesRequest$, () => ListGroupPoliciesResponse$
];
var ListGroups$ = [9, n0, _LG,
    0, () => ListGroupsRequest$, () => ListGroupsResponse$
];
var ListGroupsForUser$ = [9, n0, _LGFU,
    0, () => ListGroupsForUserRequest$, () => ListGroupsForUserResponse$
];
var ListInstanceProfiles$ = [9, n0, _LIP,
    0, () => ListInstanceProfilesRequest$, () => ListInstanceProfilesResponse$
];
var ListInstanceProfilesForRole$ = [9, n0, _LIPFR,
    0, () => ListInstanceProfilesForRoleRequest$, () => ListInstanceProfilesForRoleResponse$
];
var ListInstanceProfileTags$ = [9, n0, _LIPT,
    0, () => ListInstanceProfileTagsRequest$, () => ListInstanceProfileTagsResponse$
];
var ListMFADevices$ = [9, n0, _LMFAD,
    0, () => ListMFADevicesRequest$, () => ListMFADevicesResponse$
];
var ListMFADeviceTags$ = [9, n0, _LMFADT,
    0, () => ListMFADeviceTagsRequest$, () => ListMFADeviceTagsResponse$
];
var ListOpenIDConnectProviders$ = [9, n0, _LOIDCP,
    0, () => ListOpenIDConnectProvidersRequest$, () => ListOpenIDConnectProvidersResponse$
];
var ListOpenIDConnectProviderTags$ = [9, n0, _LOIDCPT,
    0, () => ListOpenIDConnectProviderTagsRequest$, () => ListOpenIDConnectProviderTagsResponse$
];
var ListOrganizationsFeatures$ = [9, n0, _LOF,
    0, () => ListOrganizationsFeaturesRequest$, () => ListOrganizationsFeaturesResponse$
];
var ListPolicies$ = [9, n0, _LPi,
    0, () => ListPoliciesRequest$, () => ListPoliciesResponse$
];
var ListPoliciesGrantingServiceAccess$ = [9, n0, _LPGSA,
    0, () => ListPoliciesGrantingServiceAccessRequest$, () => ListPoliciesGrantingServiceAccessResponse$
];
var ListPolicyTags$ = [9, n0, _LPT,
    0, () => ListPolicyTagsRequest$, () => ListPolicyTagsResponse$
];
var ListPolicyVersions$ = [9, n0, _LPV,
    0, () => ListPolicyVersionsRequest$, () => ListPolicyVersionsResponse$
];
var ListRolePolicies$ = [9, n0, _LRP,
    0, () => ListRolePoliciesRequest$, () => ListRolePoliciesResponse$
];
var ListRoles$ = [9, n0, _LR,
    0, () => ListRolesRequest$, () => ListRolesResponse$
];
var ListRoleTags$ = [9, n0, _LRT,
    0, () => ListRoleTagsRequest$, () => ListRoleTagsResponse$
];
var ListSAMLProviders$ = [9, n0, _LSAMLP,
    0, () => ListSAMLProvidersRequest$, () => ListSAMLProvidersResponse$
];
var ListSAMLProviderTags$ = [9, n0, _LSAMLPT,
    0, () => ListSAMLProviderTagsRequest$, () => ListSAMLProviderTagsResponse$
];
var ListServerCertificates$ = [9, n0, _LSC,
    0, () => ListServerCertificatesRequest$, () => ListServerCertificatesResponse$
];
var ListServerCertificateTags$ = [9, n0, _LSCT,
    0, () => ListServerCertificateTagsRequest$, () => ListServerCertificateTagsResponse$
];
var ListServiceSpecificCredentials$ = [9, n0, _LSSC,
    0, () => ListServiceSpecificCredentialsRequest$, () => ListServiceSpecificCredentialsResponse$
];
var ListSigningCertificates$ = [9, n0, _LSCi,
    0, () => ListSigningCertificatesRequest$, () => ListSigningCertificatesResponse$
];
var ListSSHPublicKeys$ = [9, n0, _LSSHPK,
    0, () => ListSSHPublicKeysRequest$, () => ListSSHPublicKeysResponse$
];
var ListUserPolicies$ = [9, n0, _LUP,
    0, () => ListUserPoliciesRequest$, () => ListUserPoliciesResponse$
];
var ListUsers$ = [9, n0, _LU,
    0, () => ListUsersRequest$, () => ListUsersResponse$
];
var ListUserTags$ = [9, n0, _LUT,
    0, () => ListUserTagsRequest$, () => ListUserTagsResponse$
];
var ListVirtualMFADevices$ = [9, n0, _LVMFAD,
    0, () => ListVirtualMFADevicesRequest$, () => ListVirtualMFADevicesResponse$
];
var PutGroupPolicy$ = [9, n0, _PGP,
    0, () => PutGroupPolicyRequest$, () => __Unit
];
var PutRolePermissionsBoundary$ = [9, n0, _PRPB,
    0, () => PutRolePermissionsBoundaryRequest$, () => __Unit
];
var PutRolePolicy$ = [9, n0, _PRPu,
    0, () => PutRolePolicyRequest$, () => __Unit
];
var PutUserPermissionsBoundary$ = [9, n0, _PUPB,
    0, () => PutUserPermissionsBoundaryRequest$, () => __Unit
];
var PutUserPolicy$ = [9, n0, _PUP,
    0, () => PutUserPolicyRequest$, () => __Unit
];
var RejectDelegationRequest$ = [9, n0, _RDR,
    0, () => RejectDelegationRequestRequest$, () => __Unit
];
var RemoveClientIDFromOpenIDConnectProvider$ = [9, n0, _RCIDFOIDCP,
    0, () => RemoveClientIDFromOpenIDConnectProviderRequest$, () => __Unit
];
var RemoveRoleFromInstanceProfile$ = [9, n0, _RRFIP,
    0, () => RemoveRoleFromInstanceProfileRequest$, () => __Unit
];
var RemoveUserFromGroup$ = [9, n0, _RUFG,
    0, () => RemoveUserFromGroupRequest$, () => __Unit
];
var ResetServiceSpecificCredential$ = [9, n0, _RSSC,
    0, () => ResetServiceSpecificCredentialRequest$, () => ResetServiceSpecificCredentialResponse$
];
var ResyncMFADevice$ = [9, n0, _RMFAD,
    0, () => ResyncMFADeviceRequest$, () => __Unit
];
var SendDelegationToken$ = [9, n0, _SDT,
    0, () => SendDelegationTokenRequest$, () => __Unit
];
var SetDefaultPolicyVersion$ = [9, n0, _SDPV,
    0, () => SetDefaultPolicyVersionRequest$, () => __Unit
];
var SetSecurityTokenServicePreferences$ = [9, n0, _SSTSP,
    0, () => SetSecurityTokenServicePreferencesRequest$, () => __Unit
];
var SimulateCustomPolicy$ = [9, n0, _SCP,
    0, () => SimulateCustomPolicyRequest$, () => SimulatePolicyResponse$
];
var SimulatePrincipalPolicy$ = [9, n0, _SPP,
    0, () => SimulatePrincipalPolicyRequest$, () => SimulatePolicyResponse$
];
var TagInstanceProfile$ = [9, n0, _TIP,
    0, () => TagInstanceProfileRequest$, () => __Unit
];
var TagMFADevice$ = [9, n0, _TMFAD,
    0, () => TagMFADeviceRequest$, () => __Unit
];
var TagOpenIDConnectProvider$ = [9, n0, _TOIDCP,
    0, () => TagOpenIDConnectProviderRequest$, () => __Unit
];
var TagPolicy$ = [9, n0, _TP,
    0, () => TagPolicyRequest$, () => __Unit
];
var TagRole$ = [9, n0, _TR,
    0, () => TagRoleRequest$, () => __Unit
];
var TagSAMLProvider$ = [9, n0, _TSAMLP,
    0, () => TagSAMLProviderRequest$, () => __Unit
];
var TagServerCertificate$ = [9, n0, _TSC,
    0, () => TagServerCertificateRequest$, () => __Unit
];
var TagUser$ = [9, n0, _TU,
    0, () => TagUserRequest$, () => __Unit
];
var UntagInstanceProfile$ = [9, n0, _UIP,
    0, () => UntagInstanceProfileRequest$, () => __Unit
];
var UntagMFADevice$ = [9, n0, _UMFAD,
    0, () => UntagMFADeviceRequest$, () => __Unit
];
var UntagOpenIDConnectProvider$ = [9, n0, _UOIDCP,
    0, () => UntagOpenIDConnectProviderRequest$, () => __Unit
];
var UntagPolicy$ = [9, n0, _UP,
    0, () => UntagPolicyRequest$, () => __Unit
];
var UntagRole$ = [9, n0, _UR,
    0, () => UntagRoleRequest$, () => __Unit
];
var UntagSAMLProvider$ = [9, n0, _USAMLP,
    0, () => UntagSAMLProviderRequest$, () => __Unit
];
var UntagServerCertificate$ = [9, n0, _USC,
    0, () => UntagServerCertificateRequest$, () => __Unit
];
var UntagUser$ = [9, n0, _UU,
    0, () => UntagUserRequest$, () => __Unit
];
var UpdateAccessKey$ = [9, n0, _UAK,
    0, () => UpdateAccessKeyRequest$, () => __Unit
];
var UpdateAccountPasswordPolicy$ = [9, n0, _UAPP,
    0, () => UpdateAccountPasswordPolicyRequest$, () => __Unit
];
var UpdateAssumeRolePolicy$ = [9, n0, _UARP,
    0, () => UpdateAssumeRolePolicyRequest$, () => __Unit
];
var UpdateDelegationRequest$ = [9, n0, _UDR,
    0, () => UpdateDelegationRequestRequest$, () => __Unit
];
var UpdateGroup$ = [9, n0, _UG,
    0, () => UpdateGroupRequest$, () => __Unit
];
var UpdateLoginProfile$ = [9, n0, _ULP,
    0, () => UpdateLoginProfileRequest$, () => __Unit
];
var UpdateOpenIDConnectProviderThumbprint$ = [9, n0, _UOIDCPT,
    0, () => UpdateOpenIDConnectProviderThumbprintRequest$, () => __Unit
];
var UpdateRole$ = [9, n0, _URp,
    0, () => UpdateRoleRequest$, () => UpdateRoleResponse$
];
var UpdateRoleDescription$ = [9, n0, _URD,
    0, () => UpdateRoleDescriptionRequest$, () => UpdateRoleDescriptionResponse$
];
var UpdateSAMLProvider$ = [9, n0, _USAMLPp,
    0, () => UpdateSAMLProviderRequest$, () => UpdateSAMLProviderResponse$
];
var UpdateServerCertificate$ = [9, n0, _USCp,
    0, () => UpdateServerCertificateRequest$, () => __Unit
];
var UpdateServiceSpecificCredential$ = [9, n0, _USSC,
    0, () => UpdateServiceSpecificCredentialRequest$, () => __Unit
];
var UpdateSigningCertificate$ = [9, n0, _USCpd,
    0, () => UpdateSigningCertificateRequest$, () => __Unit
];
var UpdateSSHPublicKey$ = [9, n0, _USSHPK,
    0, () => UpdateSSHPublicKeyRequest$, () => __Unit
];
var UpdateUser$ = [9, n0, _UUp,
    0, () => UpdateUserRequest$, () => __Unit
];
var UploadServerCertificate$ = [9, n0, _USCpl,
    0, () => UploadServerCertificateRequest$, () => UploadServerCertificateResponse$
];
var UploadSigningCertificate$ = [9, n0, _USCplo,
    0, () => UploadSigningCertificateRequest$, () => UploadSigningCertificateResponse$
];
var UploadSSHPublicKey$ = [9, n0, _USSHPKp,
    0, () => UploadSSHPublicKeyRequest$, () => UploadSSHPublicKeyResponse$
];

class AcceptDelegationRequestCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AcceptDelegationRequest", {})
    .n("IAMClient", "AcceptDelegationRequestCommand")
    .sc(AcceptDelegationRequest$)
    .build() {
}

class AddClientIDToOpenIDConnectProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AddClientIDToOpenIDConnectProvider", {})
    .n("IAMClient", "AddClientIDToOpenIDConnectProviderCommand")
    .sc(AddClientIDToOpenIDConnectProvider$)
    .build() {
}

class AddRoleToInstanceProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AddRoleToInstanceProfile", {})
    .n("IAMClient", "AddRoleToInstanceProfileCommand")
    .sc(AddRoleToInstanceProfile$)
    .build() {
}

class AddUserToGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AddUserToGroup", {})
    .n("IAMClient", "AddUserToGroupCommand")
    .sc(AddUserToGroup$)
    .build() {
}

class AssociateDelegationRequestCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AssociateDelegationRequest", {})
    .n("IAMClient", "AssociateDelegationRequestCommand")
    .sc(AssociateDelegationRequest$)
    .build() {
}

class AttachGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AttachGroupPolicy", {})
    .n("IAMClient", "AttachGroupPolicyCommand")
    .sc(AttachGroupPolicy$)
    .build() {
}

class AttachRolePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AttachRolePolicy", {})
    .n("IAMClient", "AttachRolePolicyCommand")
    .sc(AttachRolePolicy$)
    .build() {
}

class AttachUserPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AttachUserPolicy", {})
    .n("IAMClient", "AttachUserPolicyCommand")
    .sc(AttachUserPolicy$)
    .build() {
}

class ChangePasswordCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ChangePassword", {})
    .n("IAMClient", "ChangePasswordCommand")
    .sc(ChangePassword$)
    .build() {
}

class CreateAccessKeyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateAccessKey", {})
    .n("IAMClient", "CreateAccessKeyCommand")
    .sc(CreateAccessKey$)
    .build() {
}

class CreateAccountAliasCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateAccountAlias", {})
    .n("IAMClient", "CreateAccountAliasCommand")
    .sc(CreateAccountAlias$)
    .build() {
}

class CreateDelegationRequestCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateDelegationRequest", {})
    .n("IAMClient", "CreateDelegationRequestCommand")
    .sc(CreateDelegationRequest$)
    .build() {
}

class CreateGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateGroup", {})
    .n("IAMClient", "CreateGroupCommand")
    .sc(CreateGroup$)
    .build() {
}

class CreateInstanceProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateInstanceProfile", {})
    .n("IAMClient", "CreateInstanceProfileCommand")
    .sc(CreateInstanceProfile$)
    .build() {
}

class CreateLoginProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateLoginProfile", {})
    .n("IAMClient", "CreateLoginProfileCommand")
    .sc(CreateLoginProfile$)
    .build() {
}

class CreateOpenIDConnectProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateOpenIDConnectProvider", {})
    .n("IAMClient", "CreateOpenIDConnectProviderCommand")
    .sc(CreateOpenIDConnectProvider$)
    .build() {
}

class CreatePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreatePolicy", {})
    .n("IAMClient", "CreatePolicyCommand")
    .sc(CreatePolicy$)
    .build() {
}

class CreatePolicyVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreatePolicyVersion", {})
    .n("IAMClient", "CreatePolicyVersionCommand")
    .sc(CreatePolicyVersion$)
    .build() {
}

class CreateRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateRole", {})
    .n("IAMClient", "CreateRoleCommand")
    .sc(CreateRole$)
    .build() {
}

class CreateSAMLProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateSAMLProvider", {})
    .n("IAMClient", "CreateSAMLProviderCommand")
    .sc(CreateSAMLProvider$)
    .build() {
}

class CreateServiceLinkedRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateServiceLinkedRole", {})
    .n("IAMClient", "CreateServiceLinkedRoleCommand")
    .sc(CreateServiceLinkedRole$)
    .build() {
}

class CreateServiceSpecificCredentialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateServiceSpecificCredential", {})
    .n("IAMClient", "CreateServiceSpecificCredentialCommand")
    .sc(CreateServiceSpecificCredential$)
    .build() {
}

class CreateUserCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateUser", {})
    .n("IAMClient", "CreateUserCommand")
    .sc(CreateUser$)
    .build() {
}

class CreateVirtualMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreateVirtualMFADevice", {})
    .n("IAMClient", "CreateVirtualMFADeviceCommand")
    .sc(CreateVirtualMFADevice$)
    .build() {
}

class DeactivateMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeactivateMFADevice", {})
    .n("IAMClient", "DeactivateMFADeviceCommand")
    .sc(DeactivateMFADevice$)
    .build() {
}

class DeleteAccessKeyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteAccessKey", {})
    .n("IAMClient", "DeleteAccessKeyCommand")
    .sc(DeleteAccessKey$)
    .build() {
}

class DeleteAccountAliasCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteAccountAlias", {})
    .n("IAMClient", "DeleteAccountAliasCommand")
    .sc(DeleteAccountAlias$)
    .build() {
}

class DeleteAccountPasswordPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteAccountPasswordPolicy", {})
    .n("IAMClient", "DeleteAccountPasswordPolicyCommand")
    .sc(DeleteAccountPasswordPolicy$)
    .build() {
}

class DeleteGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteGroup", {})
    .n("IAMClient", "DeleteGroupCommand")
    .sc(DeleteGroup$)
    .build() {
}

class DeleteGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteGroupPolicy", {})
    .n("IAMClient", "DeleteGroupPolicyCommand")
    .sc(DeleteGroupPolicy$)
    .build() {
}

class DeleteInstanceProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteInstanceProfile", {})
    .n("IAMClient", "DeleteInstanceProfileCommand")
    .sc(DeleteInstanceProfile$)
    .build() {
}

class DeleteLoginProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteLoginProfile", {})
    .n("IAMClient", "DeleteLoginProfileCommand")
    .sc(DeleteLoginProfile$)
    .build() {
}

class DeleteOpenIDConnectProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteOpenIDConnectProvider", {})
    .n("IAMClient", "DeleteOpenIDConnectProviderCommand")
    .sc(DeleteOpenIDConnectProvider$)
    .build() {
}

class DeletePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeletePolicy", {})
    .n("IAMClient", "DeletePolicyCommand")
    .sc(DeletePolicy$)
    .build() {
}

class DeletePolicyVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeletePolicyVersion", {})
    .n("IAMClient", "DeletePolicyVersionCommand")
    .sc(DeletePolicyVersion$)
    .build() {
}

class DeleteRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteRole", {})
    .n("IAMClient", "DeleteRoleCommand")
    .sc(DeleteRole$)
    .build() {
}

class DeleteRolePermissionsBoundaryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteRolePermissionsBoundary", {})
    .n("IAMClient", "DeleteRolePermissionsBoundaryCommand")
    .sc(DeleteRolePermissionsBoundary$)
    .build() {
}

class DeleteRolePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteRolePolicy", {})
    .n("IAMClient", "DeleteRolePolicyCommand")
    .sc(DeleteRolePolicy$)
    .build() {
}

class DeleteSAMLProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteSAMLProvider", {})
    .n("IAMClient", "DeleteSAMLProviderCommand")
    .sc(DeleteSAMLProvider$)
    .build() {
}

class DeleteServerCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteServerCertificate", {})
    .n("IAMClient", "DeleteServerCertificateCommand")
    .sc(DeleteServerCertificate$)
    .build() {
}

class DeleteServiceLinkedRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteServiceLinkedRole", {})
    .n("IAMClient", "DeleteServiceLinkedRoleCommand")
    .sc(DeleteServiceLinkedRole$)
    .build() {
}

class DeleteServiceSpecificCredentialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteServiceSpecificCredential", {})
    .n("IAMClient", "DeleteServiceSpecificCredentialCommand")
    .sc(DeleteServiceSpecificCredential$)
    .build() {
}

class DeleteSigningCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteSigningCertificate", {})
    .n("IAMClient", "DeleteSigningCertificateCommand")
    .sc(DeleteSigningCertificate$)
    .build() {
}

class DeleteSSHPublicKeyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteSSHPublicKey", {})
    .n("IAMClient", "DeleteSSHPublicKeyCommand")
    .sc(DeleteSSHPublicKey$)
    .build() {
}

class DeleteUserCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteUser", {})
    .n("IAMClient", "DeleteUserCommand")
    .sc(DeleteUser$)
    .build() {
}

class DeleteUserPermissionsBoundaryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteUserPermissionsBoundary", {})
    .n("IAMClient", "DeleteUserPermissionsBoundaryCommand")
    .sc(DeleteUserPermissionsBoundary$)
    .build() {
}

class DeleteUserPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteUserPolicy", {})
    .n("IAMClient", "DeleteUserPolicyCommand")
    .sc(DeleteUserPolicy$)
    .build() {
}

class DeleteVirtualMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DeleteVirtualMFADevice", {})
    .n("IAMClient", "DeleteVirtualMFADeviceCommand")
    .sc(DeleteVirtualMFADevice$)
    .build() {
}

class DetachGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DetachGroupPolicy", {})
    .n("IAMClient", "DetachGroupPolicyCommand")
    .sc(DetachGroupPolicy$)
    .build() {
}

class DetachRolePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DetachRolePolicy", {})
    .n("IAMClient", "DetachRolePolicyCommand")
    .sc(DetachRolePolicy$)
    .build() {
}

class DetachUserPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DetachUserPolicy", {})
    .n("IAMClient", "DetachUserPolicyCommand")
    .sc(DetachUserPolicy$)
    .build() {
}

class DisableOrganizationsRootCredentialsManagementCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DisableOrganizationsRootCredentialsManagement", {})
    .n("IAMClient", "DisableOrganizationsRootCredentialsManagementCommand")
    .sc(DisableOrganizationsRootCredentialsManagement$)
    .build() {
}

class DisableOrganizationsRootSessionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DisableOrganizationsRootSessions", {})
    .n("IAMClient", "DisableOrganizationsRootSessionsCommand")
    .sc(DisableOrganizationsRootSessions$)
    .build() {
}

class DisableOutboundWebIdentityFederationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DisableOutboundWebIdentityFederation", {})
    .n("IAMClient", "DisableOutboundWebIdentityFederationCommand")
    .sc(DisableOutboundWebIdentityFederation$)
    .build() {
}

class EnableMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "EnableMFADevice", {})
    .n("IAMClient", "EnableMFADeviceCommand")
    .sc(EnableMFADevice$)
    .build() {
}

class EnableOrganizationsRootCredentialsManagementCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "EnableOrganizationsRootCredentialsManagement", {})
    .n("IAMClient", "EnableOrganizationsRootCredentialsManagementCommand")
    .sc(EnableOrganizationsRootCredentialsManagement$)
    .build() {
}

class EnableOrganizationsRootSessionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "EnableOrganizationsRootSessions", {})
    .n("IAMClient", "EnableOrganizationsRootSessionsCommand")
    .sc(EnableOrganizationsRootSessions$)
    .build() {
}

class EnableOutboundWebIdentityFederationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "EnableOutboundWebIdentityFederation", {})
    .n("IAMClient", "EnableOutboundWebIdentityFederationCommand")
    .sc(EnableOutboundWebIdentityFederation$)
    .build() {
}

class GenerateCredentialReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GenerateCredentialReport", {})
    .n("IAMClient", "GenerateCredentialReportCommand")
    .sc(GenerateCredentialReport$)
    .build() {
}

class GenerateOrganizationsAccessReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GenerateOrganizationsAccessReport", {})
    .n("IAMClient", "GenerateOrganizationsAccessReportCommand")
    .sc(GenerateOrganizationsAccessReport$)
    .build() {
}

class GenerateServiceLastAccessedDetailsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GenerateServiceLastAccessedDetails", {})
    .n("IAMClient", "GenerateServiceLastAccessedDetailsCommand")
    .sc(GenerateServiceLastAccessedDetails$)
    .build() {
}

class GetAccessKeyLastUsedCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetAccessKeyLastUsed", {})
    .n("IAMClient", "GetAccessKeyLastUsedCommand")
    .sc(GetAccessKeyLastUsed$)
    .build() {
}

class GetAccountAuthorizationDetailsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetAccountAuthorizationDetails", {})
    .n("IAMClient", "GetAccountAuthorizationDetailsCommand")
    .sc(GetAccountAuthorizationDetails$)
    .build() {
}

class GetAccountPasswordPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetAccountPasswordPolicy", {})
    .n("IAMClient", "GetAccountPasswordPolicyCommand")
    .sc(GetAccountPasswordPolicy$)
    .build() {
}

class GetAccountSummaryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetAccountSummary", {})
    .n("IAMClient", "GetAccountSummaryCommand")
    .sc(GetAccountSummary$)
    .build() {
}

class GetContextKeysForCustomPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetContextKeysForCustomPolicy", {})
    .n("IAMClient", "GetContextKeysForCustomPolicyCommand")
    .sc(GetContextKeysForCustomPolicy$)
    .build() {
}

class GetContextKeysForPrincipalPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetContextKeysForPrincipalPolicy", {})
    .n("IAMClient", "GetContextKeysForPrincipalPolicyCommand")
    .sc(GetContextKeysForPrincipalPolicy$)
    .build() {
}

class GetCredentialReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetCredentialReport", {})
    .n("IAMClient", "GetCredentialReportCommand")
    .sc(GetCredentialReport$)
    .build() {
}

class GetDelegationRequestCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetDelegationRequest", {})
    .n("IAMClient", "GetDelegationRequestCommand")
    .sc(GetDelegationRequest$)
    .build() {
}

class GetGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetGroup", {})
    .n("IAMClient", "GetGroupCommand")
    .sc(GetGroup$)
    .build() {
}

class GetGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetGroupPolicy", {})
    .n("IAMClient", "GetGroupPolicyCommand")
    .sc(GetGroupPolicy$)
    .build() {
}

class GetHumanReadableSummaryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetHumanReadableSummary", {})
    .n("IAMClient", "GetHumanReadableSummaryCommand")
    .sc(GetHumanReadableSummary$)
    .build() {
}

class GetInstanceProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetInstanceProfile", {})
    .n("IAMClient", "GetInstanceProfileCommand")
    .sc(GetInstanceProfile$)
    .build() {
}

class GetLoginProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetLoginProfile", {})
    .n("IAMClient", "GetLoginProfileCommand")
    .sc(GetLoginProfile$)
    .build() {
}

class GetMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetMFADevice", {})
    .n("IAMClient", "GetMFADeviceCommand")
    .sc(GetMFADevice$)
    .build() {
}

class GetOpenIDConnectProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetOpenIDConnectProvider", {})
    .n("IAMClient", "GetOpenIDConnectProviderCommand")
    .sc(GetOpenIDConnectProvider$)
    .build() {
}

class GetOrganizationsAccessReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetOrganizationsAccessReport", {})
    .n("IAMClient", "GetOrganizationsAccessReportCommand")
    .sc(GetOrganizationsAccessReport$)
    .build() {
}

class GetOutboundWebIdentityFederationInfoCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetOutboundWebIdentityFederationInfo", {})
    .n("IAMClient", "GetOutboundWebIdentityFederationInfoCommand")
    .sc(GetOutboundWebIdentityFederationInfo$)
    .build() {
}

class GetPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetPolicy", {})
    .n("IAMClient", "GetPolicyCommand")
    .sc(GetPolicy$)
    .build() {
}

class GetPolicyVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetPolicyVersion", {})
    .n("IAMClient", "GetPolicyVersionCommand")
    .sc(GetPolicyVersion$)
    .build() {
}

class GetRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetRole", {})
    .n("IAMClient", "GetRoleCommand")
    .sc(GetRole$)
    .build() {
}

class GetRolePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetRolePolicy", {})
    .n("IAMClient", "GetRolePolicyCommand")
    .sc(GetRolePolicy$)
    .build() {
}

class GetSAMLProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetSAMLProvider", {})
    .n("IAMClient", "GetSAMLProviderCommand")
    .sc(GetSAMLProvider$)
    .build() {
}

class GetServerCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetServerCertificate", {})
    .n("IAMClient", "GetServerCertificateCommand")
    .sc(GetServerCertificate$)
    .build() {
}

class GetServiceLastAccessedDetailsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetServiceLastAccessedDetails", {})
    .n("IAMClient", "GetServiceLastAccessedDetailsCommand")
    .sc(GetServiceLastAccessedDetails$)
    .build() {
}

class GetServiceLastAccessedDetailsWithEntitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetServiceLastAccessedDetailsWithEntities", {})
    .n("IAMClient", "GetServiceLastAccessedDetailsWithEntitiesCommand")
    .sc(GetServiceLastAccessedDetailsWithEntities$)
    .build() {
}

class GetServiceLinkedRoleDeletionStatusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetServiceLinkedRoleDeletionStatus", {})
    .n("IAMClient", "GetServiceLinkedRoleDeletionStatusCommand")
    .sc(GetServiceLinkedRoleDeletionStatus$)
    .build() {
}

class GetSSHPublicKeyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetSSHPublicKey", {})
    .n("IAMClient", "GetSSHPublicKeyCommand")
    .sc(GetSSHPublicKey$)
    .build() {
}

class GetUserCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetUser", {})
    .n("IAMClient", "GetUserCommand")
    .sc(GetUser$)
    .build() {
}

class GetUserPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetUserPolicy", {})
    .n("IAMClient", "GetUserPolicyCommand")
    .sc(GetUserPolicy$)
    .build() {
}

class ListAccessKeysCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListAccessKeys", {})
    .n("IAMClient", "ListAccessKeysCommand")
    .sc(ListAccessKeys$)
    .build() {
}

class ListAccountAliasesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListAccountAliases", {})
    .n("IAMClient", "ListAccountAliasesCommand")
    .sc(ListAccountAliases$)
    .build() {
}

class ListAttachedGroupPoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListAttachedGroupPolicies", {})
    .n("IAMClient", "ListAttachedGroupPoliciesCommand")
    .sc(ListAttachedGroupPolicies$)
    .build() {
}

class ListAttachedRolePoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListAttachedRolePolicies", {})
    .n("IAMClient", "ListAttachedRolePoliciesCommand")
    .sc(ListAttachedRolePolicies$)
    .build() {
}

class ListAttachedUserPoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListAttachedUserPolicies", {})
    .n("IAMClient", "ListAttachedUserPoliciesCommand")
    .sc(ListAttachedUserPolicies$)
    .build() {
}

class ListDelegationRequestsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListDelegationRequests", {})
    .n("IAMClient", "ListDelegationRequestsCommand")
    .sc(ListDelegationRequests$)
    .build() {
}

class ListEntitiesForPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListEntitiesForPolicy", {})
    .n("IAMClient", "ListEntitiesForPolicyCommand")
    .sc(ListEntitiesForPolicy$)
    .build() {
}

class ListGroupPoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListGroupPolicies", {})
    .n("IAMClient", "ListGroupPoliciesCommand")
    .sc(ListGroupPolicies$)
    .build() {
}

class ListGroupsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListGroups", {})
    .n("IAMClient", "ListGroupsCommand")
    .sc(ListGroups$)
    .build() {
}

class ListGroupsForUserCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListGroupsForUser", {})
    .n("IAMClient", "ListGroupsForUserCommand")
    .sc(ListGroupsForUser$)
    .build() {
}

class ListInstanceProfilesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListInstanceProfiles", {})
    .n("IAMClient", "ListInstanceProfilesCommand")
    .sc(ListInstanceProfiles$)
    .build() {
}

class ListInstanceProfilesForRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListInstanceProfilesForRole", {})
    .n("IAMClient", "ListInstanceProfilesForRoleCommand")
    .sc(ListInstanceProfilesForRole$)
    .build() {
}

class ListInstanceProfileTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListInstanceProfileTags", {})
    .n("IAMClient", "ListInstanceProfileTagsCommand")
    .sc(ListInstanceProfileTags$)
    .build() {
}

class ListMFADevicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListMFADevices", {})
    .n("IAMClient", "ListMFADevicesCommand")
    .sc(ListMFADevices$)
    .build() {
}

class ListMFADeviceTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListMFADeviceTags", {})
    .n("IAMClient", "ListMFADeviceTagsCommand")
    .sc(ListMFADeviceTags$)
    .build() {
}

class ListOpenIDConnectProvidersCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListOpenIDConnectProviders", {})
    .n("IAMClient", "ListOpenIDConnectProvidersCommand")
    .sc(ListOpenIDConnectProviders$)
    .build() {
}

class ListOpenIDConnectProviderTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListOpenIDConnectProviderTags", {})
    .n("IAMClient", "ListOpenIDConnectProviderTagsCommand")
    .sc(ListOpenIDConnectProviderTags$)
    .build() {
}

class ListOrganizationsFeaturesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListOrganizationsFeatures", {})
    .n("IAMClient", "ListOrganizationsFeaturesCommand")
    .sc(ListOrganizationsFeatures$)
    .build() {
}

class ListPoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListPolicies", {})
    .n("IAMClient", "ListPoliciesCommand")
    .sc(ListPolicies$)
    .build() {
}

class ListPoliciesGrantingServiceAccessCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListPoliciesGrantingServiceAccess", {})
    .n("IAMClient", "ListPoliciesGrantingServiceAccessCommand")
    .sc(ListPoliciesGrantingServiceAccess$)
    .build() {
}

class ListPolicyTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListPolicyTags", {})
    .n("IAMClient", "ListPolicyTagsCommand")
    .sc(ListPolicyTags$)
    .build() {
}

class ListPolicyVersionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListPolicyVersions", {})
    .n("IAMClient", "ListPolicyVersionsCommand")
    .sc(ListPolicyVersions$)
    .build() {
}

class ListRolePoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListRolePolicies", {})
    .n("IAMClient", "ListRolePoliciesCommand")
    .sc(ListRolePolicies$)
    .build() {
}

class ListRolesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListRoles", {})
    .n("IAMClient", "ListRolesCommand")
    .sc(ListRoles$)
    .build() {
}

class ListRoleTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListRoleTags", {})
    .n("IAMClient", "ListRoleTagsCommand")
    .sc(ListRoleTags$)
    .build() {
}

class ListSAMLProvidersCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListSAMLProviders", {})
    .n("IAMClient", "ListSAMLProvidersCommand")
    .sc(ListSAMLProviders$)
    .build() {
}

class ListSAMLProviderTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListSAMLProviderTags", {})
    .n("IAMClient", "ListSAMLProviderTagsCommand")
    .sc(ListSAMLProviderTags$)
    .build() {
}

class ListServerCertificatesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListServerCertificates", {})
    .n("IAMClient", "ListServerCertificatesCommand")
    .sc(ListServerCertificates$)
    .build() {
}

class ListServerCertificateTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListServerCertificateTags", {})
    .n("IAMClient", "ListServerCertificateTagsCommand")
    .sc(ListServerCertificateTags$)
    .build() {
}

class ListServiceSpecificCredentialsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListServiceSpecificCredentials", {})
    .n("IAMClient", "ListServiceSpecificCredentialsCommand")
    .sc(ListServiceSpecificCredentials$)
    .build() {
}

class ListSigningCertificatesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListSigningCertificates", {})
    .n("IAMClient", "ListSigningCertificatesCommand")
    .sc(ListSigningCertificates$)
    .build() {
}

class ListSSHPublicKeysCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListSSHPublicKeys", {})
    .n("IAMClient", "ListSSHPublicKeysCommand")
    .sc(ListSSHPublicKeys$)
    .build() {
}

class ListUserPoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListUserPolicies", {})
    .n("IAMClient", "ListUserPoliciesCommand")
    .sc(ListUserPolicies$)
    .build() {
}

class ListUsersCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListUsers", {})
    .n("IAMClient", "ListUsersCommand")
    .sc(ListUsers$)
    .build() {
}

class ListUserTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListUserTags", {})
    .n("IAMClient", "ListUserTagsCommand")
    .sc(ListUserTags$)
    .build() {
}

class ListVirtualMFADevicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ListVirtualMFADevices", {})
    .n("IAMClient", "ListVirtualMFADevicesCommand")
    .sc(ListVirtualMFADevices$)
    .build() {
}

class PutGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "PutGroupPolicy", {})
    .n("IAMClient", "PutGroupPolicyCommand")
    .sc(PutGroupPolicy$)
    .build() {
}

class PutRolePermissionsBoundaryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "PutRolePermissionsBoundary", {})
    .n("IAMClient", "PutRolePermissionsBoundaryCommand")
    .sc(PutRolePermissionsBoundary$)
    .build() {
}

class PutRolePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "PutRolePolicy", {})
    .n("IAMClient", "PutRolePolicyCommand")
    .sc(PutRolePolicy$)
    .build() {
}

class PutUserPermissionsBoundaryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "PutUserPermissionsBoundary", {})
    .n("IAMClient", "PutUserPermissionsBoundaryCommand")
    .sc(PutUserPermissionsBoundary$)
    .build() {
}

class PutUserPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "PutUserPolicy", {})
    .n("IAMClient", "PutUserPolicyCommand")
    .sc(PutUserPolicy$)
    .build() {
}

class RejectDelegationRequestCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "RejectDelegationRequest", {})
    .n("IAMClient", "RejectDelegationRequestCommand")
    .sc(RejectDelegationRequest$)
    .build() {
}

class RemoveClientIDFromOpenIDConnectProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "RemoveClientIDFromOpenIDConnectProvider", {})
    .n("IAMClient", "RemoveClientIDFromOpenIDConnectProviderCommand")
    .sc(RemoveClientIDFromOpenIDConnectProvider$)
    .build() {
}

class RemoveRoleFromInstanceProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "RemoveRoleFromInstanceProfile", {})
    .n("IAMClient", "RemoveRoleFromInstanceProfileCommand")
    .sc(RemoveRoleFromInstanceProfile$)
    .build() {
}

class RemoveUserFromGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "RemoveUserFromGroup", {})
    .n("IAMClient", "RemoveUserFromGroupCommand")
    .sc(RemoveUserFromGroup$)
    .build() {
}

class ResetServiceSpecificCredentialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ResetServiceSpecificCredential", {})
    .n("IAMClient", "ResetServiceSpecificCredentialCommand")
    .sc(ResetServiceSpecificCredential$)
    .build() {
}

class ResyncMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ResyncMFADevice", {})
    .n("IAMClient", "ResyncMFADeviceCommand")
    .sc(ResyncMFADevice$)
    .build() {
}

class SendDelegationTokenCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "SendDelegationToken", {})
    .n("IAMClient", "SendDelegationTokenCommand")
    .sc(SendDelegationToken$)
    .build() {
}

class SetDefaultPolicyVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "SetDefaultPolicyVersion", {})
    .n("IAMClient", "SetDefaultPolicyVersionCommand")
    .sc(SetDefaultPolicyVersion$)
    .build() {
}

class SetSecurityTokenServicePreferencesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "SetSecurityTokenServicePreferences", {})
    .n("IAMClient", "SetSecurityTokenServicePreferencesCommand")
    .sc(SetSecurityTokenServicePreferences$)
    .build() {
}

class SimulateCustomPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "SimulateCustomPolicy", {})
    .n("IAMClient", "SimulateCustomPolicyCommand")
    .sc(SimulateCustomPolicy$)
    .build() {
}

class SimulatePrincipalPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "SimulatePrincipalPolicy", {})
    .n("IAMClient", "SimulatePrincipalPolicyCommand")
    .sc(SimulatePrincipalPolicy$)
    .build() {
}

class TagInstanceProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagInstanceProfile", {})
    .n("IAMClient", "TagInstanceProfileCommand")
    .sc(TagInstanceProfile$)
    .build() {
}

class TagMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagMFADevice", {})
    .n("IAMClient", "TagMFADeviceCommand")
    .sc(TagMFADevice$)
    .build() {
}

class TagOpenIDConnectProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagOpenIDConnectProvider", {})
    .n("IAMClient", "TagOpenIDConnectProviderCommand")
    .sc(TagOpenIDConnectProvider$)
    .build() {
}

class TagPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagPolicy", {})
    .n("IAMClient", "TagPolicyCommand")
    .sc(TagPolicy$)
    .build() {
}

class TagRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagRole", {})
    .n("IAMClient", "TagRoleCommand")
    .sc(TagRole$)
    .build() {
}

class TagSAMLProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagSAMLProvider", {})
    .n("IAMClient", "TagSAMLProviderCommand")
    .sc(TagSAMLProvider$)
    .build() {
}

class TagServerCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagServerCertificate", {})
    .n("IAMClient", "TagServerCertificateCommand")
    .sc(TagServerCertificate$)
    .build() {
}

class TagUserCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "TagUser", {})
    .n("IAMClient", "TagUserCommand")
    .sc(TagUser$)
    .build() {
}

class UntagInstanceProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagInstanceProfile", {})
    .n("IAMClient", "UntagInstanceProfileCommand")
    .sc(UntagInstanceProfile$)
    .build() {
}

class UntagMFADeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagMFADevice", {})
    .n("IAMClient", "UntagMFADeviceCommand")
    .sc(UntagMFADevice$)
    .build() {
}

class UntagOpenIDConnectProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagOpenIDConnectProvider", {})
    .n("IAMClient", "UntagOpenIDConnectProviderCommand")
    .sc(UntagOpenIDConnectProvider$)
    .build() {
}

class UntagPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagPolicy", {})
    .n("IAMClient", "UntagPolicyCommand")
    .sc(UntagPolicy$)
    .build() {
}

class UntagRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagRole", {})
    .n("IAMClient", "UntagRoleCommand")
    .sc(UntagRole$)
    .build() {
}

class UntagSAMLProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagSAMLProvider", {})
    .n("IAMClient", "UntagSAMLProviderCommand")
    .sc(UntagSAMLProvider$)
    .build() {
}

class UntagServerCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagServerCertificate", {})
    .n("IAMClient", "UntagServerCertificateCommand")
    .sc(UntagServerCertificate$)
    .build() {
}

class UntagUserCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UntagUser", {})
    .n("IAMClient", "UntagUserCommand")
    .sc(UntagUser$)
    .build() {
}

class UpdateAccessKeyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateAccessKey", {})
    .n("IAMClient", "UpdateAccessKeyCommand")
    .sc(UpdateAccessKey$)
    .build() {
}

class UpdateAccountPasswordPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateAccountPasswordPolicy", {})
    .n("IAMClient", "UpdateAccountPasswordPolicyCommand")
    .sc(UpdateAccountPasswordPolicy$)
    .build() {
}

class UpdateAssumeRolePolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateAssumeRolePolicy", {})
    .n("IAMClient", "UpdateAssumeRolePolicyCommand")
    .sc(UpdateAssumeRolePolicy$)
    .build() {
}

class UpdateDelegationRequestCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateDelegationRequest", {})
    .n("IAMClient", "UpdateDelegationRequestCommand")
    .sc(UpdateDelegationRequest$)
    .build() {
}

class UpdateGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateGroup", {})
    .n("IAMClient", "UpdateGroupCommand")
    .sc(UpdateGroup$)
    .build() {
}

class UpdateLoginProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateLoginProfile", {})
    .n("IAMClient", "UpdateLoginProfileCommand")
    .sc(UpdateLoginProfile$)
    .build() {
}

class UpdateOpenIDConnectProviderThumbprintCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateOpenIDConnectProviderThumbprint", {})
    .n("IAMClient", "UpdateOpenIDConnectProviderThumbprintCommand")
    .sc(UpdateOpenIDConnectProviderThumbprint$)
    .build() {
}

class UpdateRoleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateRole", {})
    .n("IAMClient", "UpdateRoleCommand")
    .sc(UpdateRole$)
    .build() {
}

class UpdateRoleDescriptionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateRoleDescription", {})
    .n("IAMClient", "UpdateRoleDescriptionCommand")
    .sc(UpdateRoleDescription$)
    .build() {
}

class UpdateSAMLProviderCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateSAMLProvider", {})
    .n("IAMClient", "UpdateSAMLProviderCommand")
    .sc(UpdateSAMLProvider$)
    .build() {
}

class UpdateServerCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateServerCertificate", {})
    .n("IAMClient", "UpdateServerCertificateCommand")
    .sc(UpdateServerCertificate$)
    .build() {
}

class UpdateServiceSpecificCredentialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateServiceSpecificCredential", {})
    .n("IAMClient", "UpdateServiceSpecificCredentialCommand")
    .sc(UpdateServiceSpecificCredential$)
    .build() {
}

class UpdateSigningCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateSigningCertificate", {})
    .n("IAMClient", "UpdateSigningCertificateCommand")
    .sc(UpdateSigningCertificate$)
    .build() {
}

class UpdateSSHPublicKeyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateSSHPublicKey", {})
    .n("IAMClient", "UpdateSSHPublicKeyCommand")
    .sc(UpdateSSHPublicKey$)
    .build() {
}

class UpdateUserCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateUser", {})
    .n("IAMClient", "UpdateUserCommand")
    .sc(UpdateUser$)
    .build() {
}

class UploadServerCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UploadServerCertificate", {})
    .n("IAMClient", "UploadServerCertificateCommand")
    .sc(UploadServerCertificate$)
    .build() {
}

class UploadSigningCertificateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UploadSigningCertificate", {})
    .n("IAMClient", "UploadSigningCertificateCommand")
    .sc(UploadSigningCertificate$)
    .build() {
}

class UploadSSHPublicKeyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UploadSSHPublicKey", {})
    .n("IAMClient", "UploadSSHPublicKeyCommand")
    .sc(UploadSSHPublicKey$)
    .build() {
}

const paginateGetAccountAuthorizationDetails = core.createPaginator(IAMClient, GetAccountAuthorizationDetailsCommand, "Marker", "Marker", "MaxItems");

const paginateGetGroup = core.createPaginator(IAMClient, GetGroupCommand, "Marker", "Marker", "MaxItems");

const paginateListAccessKeys = core.createPaginator(IAMClient, ListAccessKeysCommand, "Marker", "Marker", "MaxItems");

const paginateListAccountAliases = core.createPaginator(IAMClient, ListAccountAliasesCommand, "Marker", "Marker", "MaxItems");

const paginateListAttachedGroupPolicies = core.createPaginator(IAMClient, ListAttachedGroupPoliciesCommand, "Marker", "Marker", "MaxItems");

const paginateListAttachedRolePolicies = core.createPaginator(IAMClient, ListAttachedRolePoliciesCommand, "Marker", "Marker", "MaxItems");

const paginateListAttachedUserPolicies = core.createPaginator(IAMClient, ListAttachedUserPoliciesCommand, "Marker", "Marker", "MaxItems");

const paginateListEntitiesForPolicy = core.createPaginator(IAMClient, ListEntitiesForPolicyCommand, "Marker", "Marker", "MaxItems");

const paginateListGroupPolicies = core.createPaginator(IAMClient, ListGroupPoliciesCommand, "Marker", "Marker", "MaxItems");

const paginateListGroupsForUser = core.createPaginator(IAMClient, ListGroupsForUserCommand, "Marker", "Marker", "MaxItems");

const paginateListGroups = core.createPaginator(IAMClient, ListGroupsCommand, "Marker", "Marker", "MaxItems");

const paginateListInstanceProfilesForRole = core.createPaginator(IAMClient, ListInstanceProfilesForRoleCommand, "Marker", "Marker", "MaxItems");

const paginateListInstanceProfiles = core.createPaginator(IAMClient, ListInstanceProfilesCommand, "Marker", "Marker", "MaxItems");

const paginateListInstanceProfileTags = core.createPaginator(IAMClient, ListInstanceProfileTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListMFADevices = core.createPaginator(IAMClient, ListMFADevicesCommand, "Marker", "Marker", "MaxItems");

const paginateListMFADeviceTags = core.createPaginator(IAMClient, ListMFADeviceTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListOpenIDConnectProviderTags = core.createPaginator(IAMClient, ListOpenIDConnectProviderTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListPolicies = core.createPaginator(IAMClient, ListPoliciesCommand, "Marker", "Marker", "MaxItems");

const paginateListPolicyTags = core.createPaginator(IAMClient, ListPolicyTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListPolicyVersions = core.createPaginator(IAMClient, ListPolicyVersionsCommand, "Marker", "Marker", "MaxItems");

const paginateListRolePolicies = core.createPaginator(IAMClient, ListRolePoliciesCommand, "Marker", "Marker", "MaxItems");

const paginateListRoles = core.createPaginator(IAMClient, ListRolesCommand, "Marker", "Marker", "MaxItems");

const paginateListRoleTags = core.createPaginator(IAMClient, ListRoleTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListSAMLProviderTags = core.createPaginator(IAMClient, ListSAMLProviderTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListServerCertificates = core.createPaginator(IAMClient, ListServerCertificatesCommand, "Marker", "Marker", "MaxItems");

const paginateListServerCertificateTags = core.createPaginator(IAMClient, ListServerCertificateTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListSigningCertificates = core.createPaginator(IAMClient, ListSigningCertificatesCommand, "Marker", "Marker", "MaxItems");

const paginateListSSHPublicKeys = core.createPaginator(IAMClient, ListSSHPublicKeysCommand, "Marker", "Marker", "MaxItems");

const paginateListUserPolicies = core.createPaginator(IAMClient, ListUserPoliciesCommand, "Marker", "Marker", "MaxItems");

const paginateListUsers = core.createPaginator(IAMClient, ListUsersCommand, "Marker", "Marker", "MaxItems");

const paginateListUserTags = core.createPaginator(IAMClient, ListUserTagsCommand, "Marker", "Marker", "MaxItems");

const paginateListVirtualMFADevices = core.createPaginator(IAMClient, ListVirtualMFADevicesCommand, "Marker", "Marker", "MaxItems");

const paginateSimulateCustomPolicy = core.createPaginator(IAMClient, SimulateCustomPolicyCommand, "Marker", "Marker", "MaxItems");

const paginateSimulatePrincipalPolicy = core.createPaginator(IAMClient, SimulatePrincipalPolicyCommand, "Marker", "Marker", "MaxItems");

const checkState$3 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new GetInstanceProfileCommand(input));
        reason = result;
        return { state: utilWaiter.WaiterState.SUCCESS, reason };
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NoSuchEntityException") {
            return { state: utilWaiter.WaiterState.RETRY, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForInstanceProfileExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$3);
};
const waitUntilInstanceProfileExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$3);
    return utilWaiter.checkExceptions(result);
};

const checkState$2 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new GetPolicyCommand(input));
        reason = result;
        return { state: utilWaiter.WaiterState.SUCCESS, reason };
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NoSuchEntityException") {
            return { state: utilWaiter.WaiterState.RETRY, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForPolicyExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$2);
};
const waitUntilPolicyExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$2);
    return utilWaiter.checkExceptions(result);
};

const checkState$1 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new GetRoleCommand(input));
        reason = result;
        return { state: utilWaiter.WaiterState.SUCCESS, reason };
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NoSuchEntityException") {
            return { state: utilWaiter.WaiterState.RETRY, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForRoleExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$1);
};
const waitUntilRoleExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$1);
    return utilWaiter.checkExceptions(result);
};

const checkState = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new GetUserCommand(input));
        reason = result;
        return { state: utilWaiter.WaiterState.SUCCESS, reason };
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NoSuchEntityException") {
            return { state: utilWaiter.WaiterState.RETRY, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForUserExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
const waitUntilUserExists = async (params, input) => {
    const serviceDefaults = { minDelay: 1, maxDelay: 120 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return utilWaiter.checkExceptions(result);
};

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
class IAM extends IAMClient {
}
smithyClient.createAggregatedClient(commands, IAM, { paginators, waiters });

const AccessAdvisorUsageGranularityType = {
    ACTION_LEVEL: "ACTION_LEVEL",
    SERVICE_LEVEL: "SERVICE_LEVEL",
};
const StatusType = {
    Active: "Active",
    Expired: "Expired",
    Inactive: "Inactive",
};
const AssertionEncryptionModeType = {
    Allowed: "Allowed",
    Required: "Required",
};
const AssignmentStatusType = {
    Any: "Any",
    Assigned: "Assigned",
    Unassigned: "Unassigned",
};
const PermissionsBoundaryAttachmentType = {
    Policy: "PermissionsBoundaryPolicy",
};
const PolicyParameterTypeEnum = {
    STRING: "string",
    STRING_LIST: "stringList",
};
const FeatureType = {
    ROOT_CREDENTIALS_MANAGEMENT: "RootCredentialsManagement",
    ROOT_SESSIONS: "RootSessions",
};
const ReportStateType = {
    COMPLETE: "COMPLETE",
    INPROGRESS: "INPROGRESS",
    STARTED: "STARTED",
};
const EntityType = {
    AWSManagedPolicy: "AWSManagedPolicy",
    Group: "Group",
    LocalManagedPolicy: "LocalManagedPolicy",
    Role: "Role",
    User: "User",
};
const SummaryKeyType = {
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
const ReportFormatType = {
    text_csv: "text/csv",
};
const StateType = {
    ACCEPTED: "ACCEPTED",
    ASSIGNED: "ASSIGNED",
    EXPIRED: "EXPIRED",
    FINALIZED: "FINALIZED",
    PENDING_APPROVAL: "PENDING_APPROVAL",
    REJECTED: "REJECTED",
    UNASSIGNED: "UNASSIGNED",
};
const PermissionCheckResultType = {
    ALLOWED: "ALLOWED",
    DENIED: "DENIED",
    UNSURE: "UNSURE",
};
const PermissionCheckStatusType = {
    COMPLETE: "COMPLETE",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
};
const SummaryStateType = {
    AVAILABLE: "AVAILABLE",
    FAILED: "FAILED",
    NOT_AVAILABLE: "NOT_AVAILABLE",
    NOT_SUPPORTED: "NOT_SUPPORTED",
};
const SortKeyType = {
    LAST_AUTHENTICATED_TIME_ASCENDING: "LAST_AUTHENTICATED_TIME_ASCENDING",
    LAST_AUTHENTICATED_TIME_DESCENDING: "LAST_AUTHENTICATED_TIME_DESCENDING",
    SERVICE_NAMESPACE_ASCENDING: "SERVICE_NAMESPACE_ASCENDING",
    SERVICE_NAMESPACE_DESCENDING: "SERVICE_NAMESPACE_DESCENDING",
};
const JobStatusType = {
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
};
const PolicyOwnerEntityType = {
    GROUP: "GROUP",
    ROLE: "ROLE",
    USER: "USER",
};
const DeletionTaskStatusType = {
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
    NOT_STARTED: "NOT_STARTED",
    SUCCEEDED: "SUCCEEDED",
};
const EncodingType = {
    PEM: "PEM",
    SSH: "SSH",
};
const PolicyUsageType = {
    PermissionsBoundary: "PermissionsBoundary",
    PermissionsPolicy: "PermissionsPolicy",
};
const PolicyScopeType = {
    AWS: "AWS",
    All: "All",
    Local: "Local",
};
const PolicyType = {
    INLINE: "INLINE",
    MANAGED: "MANAGED",
};
const GlobalEndpointTokenVersion = {
    v1Token: "v1Token",
    v2Token: "v2Token",
};
const ContextKeyTypeEnum = {
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
const PolicyEvaluationDecisionType = {
    ALLOWED: "allowed",
    EXPLICIT_DENY: "explicitDeny",
    IMPLICIT_DENY: "implicitDeny",
};
const PolicySourceType = {
    AWS_MANAGED: "aws-managed",
    GROUP: "group",
    NONE: "none",
    RESOURCE: "resource",
    ROLE: "role",
    USER: "user",
    USER_MANAGED: "user-managed",
};

Object.defineProperty(exports, "$Command", {
    enumerable: true,
    get: function () { return smithyClient.Command; }
});
Object.defineProperty(exports, "__Client", {
    enumerable: true,
    get: function () { return smithyClient.Client; }
});
exports.AcceptDelegationRequest$ = AcceptDelegationRequest$;
exports.AcceptDelegationRequestCommand = AcceptDelegationRequestCommand;
exports.AcceptDelegationRequestRequest$ = AcceptDelegationRequestRequest$;
exports.AccessAdvisorUsageGranularityType = AccessAdvisorUsageGranularityType;
exports.AccessDetail$ = AccessDetail$;
exports.AccessKey$ = AccessKey$;
exports.AccessKeyLastUsed$ = AccessKeyLastUsed$;
exports.AccessKeyMetadata$ = AccessKeyMetadata$;
exports.AccountNotManagementOrDelegatedAdministratorException = AccountNotManagementOrDelegatedAdministratorException;
exports.AccountNotManagementOrDelegatedAdministratorException$ = AccountNotManagementOrDelegatedAdministratorException$;
exports.AddClientIDToOpenIDConnectProvider$ = AddClientIDToOpenIDConnectProvider$;
exports.AddClientIDToOpenIDConnectProviderCommand = AddClientIDToOpenIDConnectProviderCommand;
exports.AddClientIDToOpenIDConnectProviderRequest$ = AddClientIDToOpenIDConnectProviderRequest$;
exports.AddRoleToInstanceProfile$ = AddRoleToInstanceProfile$;
exports.AddRoleToInstanceProfileCommand = AddRoleToInstanceProfileCommand;
exports.AddRoleToInstanceProfileRequest$ = AddRoleToInstanceProfileRequest$;
exports.AddUserToGroup$ = AddUserToGroup$;
exports.AddUserToGroupCommand = AddUserToGroupCommand;
exports.AddUserToGroupRequest$ = AddUserToGroupRequest$;
exports.AssertionEncryptionModeType = AssertionEncryptionModeType;
exports.AssignmentStatusType = AssignmentStatusType;
exports.AssociateDelegationRequest$ = AssociateDelegationRequest$;
exports.AssociateDelegationRequestCommand = AssociateDelegationRequestCommand;
exports.AssociateDelegationRequestRequest$ = AssociateDelegationRequestRequest$;
exports.AttachGroupPolicy$ = AttachGroupPolicy$;
exports.AttachGroupPolicyCommand = AttachGroupPolicyCommand;
exports.AttachGroupPolicyRequest$ = AttachGroupPolicyRequest$;
exports.AttachRolePolicy$ = AttachRolePolicy$;
exports.AttachRolePolicyCommand = AttachRolePolicyCommand;
exports.AttachRolePolicyRequest$ = AttachRolePolicyRequest$;
exports.AttachUserPolicy$ = AttachUserPolicy$;
exports.AttachUserPolicyCommand = AttachUserPolicyCommand;
exports.AttachUserPolicyRequest$ = AttachUserPolicyRequest$;
exports.AttachedPermissionsBoundary$ = AttachedPermissionsBoundary$;
exports.AttachedPolicy$ = AttachedPolicy$;
exports.CallerIsNotManagementAccountException = CallerIsNotManagementAccountException;
exports.CallerIsNotManagementAccountException$ = CallerIsNotManagementAccountException$;
exports.ChangePassword$ = ChangePassword$;
exports.ChangePasswordCommand = ChangePasswordCommand;
exports.ChangePasswordRequest$ = ChangePasswordRequest$;
exports.ConcurrentModificationException = ConcurrentModificationException;
exports.ConcurrentModificationException$ = ConcurrentModificationException$;
exports.ContextEntry$ = ContextEntry$;
exports.ContextKeyTypeEnum = ContextKeyTypeEnum;
exports.CreateAccessKey$ = CreateAccessKey$;
exports.CreateAccessKeyCommand = CreateAccessKeyCommand;
exports.CreateAccessKeyRequest$ = CreateAccessKeyRequest$;
exports.CreateAccessKeyResponse$ = CreateAccessKeyResponse$;
exports.CreateAccountAlias$ = CreateAccountAlias$;
exports.CreateAccountAliasCommand = CreateAccountAliasCommand;
exports.CreateAccountAliasRequest$ = CreateAccountAliasRequest$;
exports.CreateDelegationRequest$ = CreateDelegationRequest$;
exports.CreateDelegationRequestCommand = CreateDelegationRequestCommand;
exports.CreateDelegationRequestRequest$ = CreateDelegationRequestRequest$;
exports.CreateDelegationRequestResponse$ = CreateDelegationRequestResponse$;
exports.CreateGroup$ = CreateGroup$;
exports.CreateGroupCommand = CreateGroupCommand;
exports.CreateGroupRequest$ = CreateGroupRequest$;
exports.CreateGroupResponse$ = CreateGroupResponse$;
exports.CreateInstanceProfile$ = CreateInstanceProfile$;
exports.CreateInstanceProfileCommand = CreateInstanceProfileCommand;
exports.CreateInstanceProfileRequest$ = CreateInstanceProfileRequest$;
exports.CreateInstanceProfileResponse$ = CreateInstanceProfileResponse$;
exports.CreateLoginProfile$ = CreateLoginProfile$;
exports.CreateLoginProfileCommand = CreateLoginProfileCommand;
exports.CreateLoginProfileRequest$ = CreateLoginProfileRequest$;
exports.CreateLoginProfileResponse$ = CreateLoginProfileResponse$;
exports.CreateOpenIDConnectProvider$ = CreateOpenIDConnectProvider$;
exports.CreateOpenIDConnectProviderCommand = CreateOpenIDConnectProviderCommand;
exports.CreateOpenIDConnectProviderRequest$ = CreateOpenIDConnectProviderRequest$;
exports.CreateOpenIDConnectProviderResponse$ = CreateOpenIDConnectProviderResponse$;
exports.CreatePolicy$ = CreatePolicy$;
exports.CreatePolicyCommand = CreatePolicyCommand;
exports.CreatePolicyRequest$ = CreatePolicyRequest$;
exports.CreatePolicyResponse$ = CreatePolicyResponse$;
exports.CreatePolicyVersion$ = CreatePolicyVersion$;
exports.CreatePolicyVersionCommand = CreatePolicyVersionCommand;
exports.CreatePolicyVersionRequest$ = CreatePolicyVersionRequest$;
exports.CreatePolicyVersionResponse$ = CreatePolicyVersionResponse$;
exports.CreateRole$ = CreateRole$;
exports.CreateRoleCommand = CreateRoleCommand;
exports.CreateRoleRequest$ = CreateRoleRequest$;
exports.CreateRoleResponse$ = CreateRoleResponse$;
exports.CreateSAMLProvider$ = CreateSAMLProvider$;
exports.CreateSAMLProviderCommand = CreateSAMLProviderCommand;
exports.CreateSAMLProviderRequest$ = CreateSAMLProviderRequest$;
exports.CreateSAMLProviderResponse$ = CreateSAMLProviderResponse$;
exports.CreateServiceLinkedRole$ = CreateServiceLinkedRole$;
exports.CreateServiceLinkedRoleCommand = CreateServiceLinkedRoleCommand;
exports.CreateServiceLinkedRoleRequest$ = CreateServiceLinkedRoleRequest$;
exports.CreateServiceLinkedRoleResponse$ = CreateServiceLinkedRoleResponse$;
exports.CreateServiceSpecificCredential$ = CreateServiceSpecificCredential$;
exports.CreateServiceSpecificCredentialCommand = CreateServiceSpecificCredentialCommand;
exports.CreateServiceSpecificCredentialRequest$ = CreateServiceSpecificCredentialRequest$;
exports.CreateServiceSpecificCredentialResponse$ = CreateServiceSpecificCredentialResponse$;
exports.CreateUser$ = CreateUser$;
exports.CreateUserCommand = CreateUserCommand;
exports.CreateUserRequest$ = CreateUserRequest$;
exports.CreateUserResponse$ = CreateUserResponse$;
exports.CreateVirtualMFADevice$ = CreateVirtualMFADevice$;
exports.CreateVirtualMFADeviceCommand = CreateVirtualMFADeviceCommand;
exports.CreateVirtualMFADeviceRequest$ = CreateVirtualMFADeviceRequest$;
exports.CreateVirtualMFADeviceResponse$ = CreateVirtualMFADeviceResponse$;
exports.CredentialReportExpiredException = CredentialReportExpiredException;
exports.CredentialReportExpiredException$ = CredentialReportExpiredException$;
exports.CredentialReportNotPresentException = CredentialReportNotPresentException;
exports.CredentialReportNotPresentException$ = CredentialReportNotPresentException$;
exports.CredentialReportNotReadyException = CredentialReportNotReadyException;
exports.CredentialReportNotReadyException$ = CredentialReportNotReadyException$;
exports.DeactivateMFADevice$ = DeactivateMFADevice$;
exports.DeactivateMFADeviceCommand = DeactivateMFADeviceCommand;
exports.DeactivateMFADeviceRequest$ = DeactivateMFADeviceRequest$;
exports.DelegationPermission$ = DelegationPermission$;
exports.DelegationRequest$ = DelegationRequest$;
exports.DeleteAccessKey$ = DeleteAccessKey$;
exports.DeleteAccessKeyCommand = DeleteAccessKeyCommand;
exports.DeleteAccessKeyRequest$ = DeleteAccessKeyRequest$;
exports.DeleteAccountAlias$ = DeleteAccountAlias$;
exports.DeleteAccountAliasCommand = DeleteAccountAliasCommand;
exports.DeleteAccountAliasRequest$ = DeleteAccountAliasRequest$;
exports.DeleteAccountPasswordPolicy$ = DeleteAccountPasswordPolicy$;
exports.DeleteAccountPasswordPolicyCommand = DeleteAccountPasswordPolicyCommand;
exports.DeleteConflictException = DeleteConflictException;
exports.DeleteConflictException$ = DeleteConflictException$;
exports.DeleteGroup$ = DeleteGroup$;
exports.DeleteGroupCommand = DeleteGroupCommand;
exports.DeleteGroupPolicy$ = DeleteGroupPolicy$;
exports.DeleteGroupPolicyCommand = DeleteGroupPolicyCommand;
exports.DeleteGroupPolicyRequest$ = DeleteGroupPolicyRequest$;
exports.DeleteGroupRequest$ = DeleteGroupRequest$;
exports.DeleteInstanceProfile$ = DeleteInstanceProfile$;
exports.DeleteInstanceProfileCommand = DeleteInstanceProfileCommand;
exports.DeleteInstanceProfileRequest$ = DeleteInstanceProfileRequest$;
exports.DeleteLoginProfile$ = DeleteLoginProfile$;
exports.DeleteLoginProfileCommand = DeleteLoginProfileCommand;
exports.DeleteLoginProfileRequest$ = DeleteLoginProfileRequest$;
exports.DeleteOpenIDConnectProvider$ = DeleteOpenIDConnectProvider$;
exports.DeleteOpenIDConnectProviderCommand = DeleteOpenIDConnectProviderCommand;
exports.DeleteOpenIDConnectProviderRequest$ = DeleteOpenIDConnectProviderRequest$;
exports.DeletePolicy$ = DeletePolicy$;
exports.DeletePolicyCommand = DeletePolicyCommand;
exports.DeletePolicyRequest$ = DeletePolicyRequest$;
exports.DeletePolicyVersion$ = DeletePolicyVersion$;
exports.DeletePolicyVersionCommand = DeletePolicyVersionCommand;
exports.DeletePolicyVersionRequest$ = DeletePolicyVersionRequest$;
exports.DeleteRole$ = DeleteRole$;
exports.DeleteRoleCommand = DeleteRoleCommand;
exports.DeleteRolePermissionsBoundary$ = DeleteRolePermissionsBoundary$;
exports.DeleteRolePermissionsBoundaryCommand = DeleteRolePermissionsBoundaryCommand;
exports.DeleteRolePermissionsBoundaryRequest$ = DeleteRolePermissionsBoundaryRequest$;
exports.DeleteRolePolicy$ = DeleteRolePolicy$;
exports.DeleteRolePolicyCommand = DeleteRolePolicyCommand;
exports.DeleteRolePolicyRequest$ = DeleteRolePolicyRequest$;
exports.DeleteRoleRequest$ = DeleteRoleRequest$;
exports.DeleteSAMLProvider$ = DeleteSAMLProvider$;
exports.DeleteSAMLProviderCommand = DeleteSAMLProviderCommand;
exports.DeleteSAMLProviderRequest$ = DeleteSAMLProviderRequest$;
exports.DeleteSSHPublicKey$ = DeleteSSHPublicKey$;
exports.DeleteSSHPublicKeyCommand = DeleteSSHPublicKeyCommand;
exports.DeleteSSHPublicKeyRequest$ = DeleteSSHPublicKeyRequest$;
exports.DeleteServerCertificate$ = DeleteServerCertificate$;
exports.DeleteServerCertificateCommand = DeleteServerCertificateCommand;
exports.DeleteServerCertificateRequest$ = DeleteServerCertificateRequest$;
exports.DeleteServiceLinkedRole$ = DeleteServiceLinkedRole$;
exports.DeleteServiceLinkedRoleCommand = DeleteServiceLinkedRoleCommand;
exports.DeleteServiceLinkedRoleRequest$ = DeleteServiceLinkedRoleRequest$;
exports.DeleteServiceLinkedRoleResponse$ = DeleteServiceLinkedRoleResponse$;
exports.DeleteServiceSpecificCredential$ = DeleteServiceSpecificCredential$;
exports.DeleteServiceSpecificCredentialCommand = DeleteServiceSpecificCredentialCommand;
exports.DeleteServiceSpecificCredentialRequest$ = DeleteServiceSpecificCredentialRequest$;
exports.DeleteSigningCertificate$ = DeleteSigningCertificate$;
exports.DeleteSigningCertificateCommand = DeleteSigningCertificateCommand;
exports.DeleteSigningCertificateRequest$ = DeleteSigningCertificateRequest$;
exports.DeleteUser$ = DeleteUser$;
exports.DeleteUserCommand = DeleteUserCommand;
exports.DeleteUserPermissionsBoundary$ = DeleteUserPermissionsBoundary$;
exports.DeleteUserPermissionsBoundaryCommand = DeleteUserPermissionsBoundaryCommand;
exports.DeleteUserPermissionsBoundaryRequest$ = DeleteUserPermissionsBoundaryRequest$;
exports.DeleteUserPolicy$ = DeleteUserPolicy$;
exports.DeleteUserPolicyCommand = DeleteUserPolicyCommand;
exports.DeleteUserPolicyRequest$ = DeleteUserPolicyRequest$;
exports.DeleteUserRequest$ = DeleteUserRequest$;
exports.DeleteVirtualMFADevice$ = DeleteVirtualMFADevice$;
exports.DeleteVirtualMFADeviceCommand = DeleteVirtualMFADeviceCommand;
exports.DeleteVirtualMFADeviceRequest$ = DeleteVirtualMFADeviceRequest$;
exports.DeletionTaskFailureReasonType$ = DeletionTaskFailureReasonType$;
exports.DeletionTaskStatusType = DeletionTaskStatusType;
exports.DetachGroupPolicy$ = DetachGroupPolicy$;
exports.DetachGroupPolicyCommand = DetachGroupPolicyCommand;
exports.DetachGroupPolicyRequest$ = DetachGroupPolicyRequest$;
exports.DetachRolePolicy$ = DetachRolePolicy$;
exports.DetachRolePolicyCommand = DetachRolePolicyCommand;
exports.DetachRolePolicyRequest$ = DetachRolePolicyRequest$;
exports.DetachUserPolicy$ = DetachUserPolicy$;
exports.DetachUserPolicyCommand = DetachUserPolicyCommand;
exports.DetachUserPolicyRequest$ = DetachUserPolicyRequest$;
exports.DisableOrganizationsRootCredentialsManagement$ = DisableOrganizationsRootCredentialsManagement$;
exports.DisableOrganizationsRootCredentialsManagementCommand = DisableOrganizationsRootCredentialsManagementCommand;
exports.DisableOrganizationsRootCredentialsManagementRequest$ = DisableOrganizationsRootCredentialsManagementRequest$;
exports.DisableOrganizationsRootCredentialsManagementResponse$ = DisableOrganizationsRootCredentialsManagementResponse$;
exports.DisableOrganizationsRootSessions$ = DisableOrganizationsRootSessions$;
exports.DisableOrganizationsRootSessionsCommand = DisableOrganizationsRootSessionsCommand;
exports.DisableOrganizationsRootSessionsRequest$ = DisableOrganizationsRootSessionsRequest$;
exports.DisableOrganizationsRootSessionsResponse$ = DisableOrganizationsRootSessionsResponse$;
exports.DisableOutboundWebIdentityFederation$ = DisableOutboundWebIdentityFederation$;
exports.DisableOutboundWebIdentityFederationCommand = DisableOutboundWebIdentityFederationCommand;
exports.DuplicateCertificateException = DuplicateCertificateException;
exports.DuplicateCertificateException$ = DuplicateCertificateException$;
exports.DuplicateSSHPublicKeyException = DuplicateSSHPublicKeyException;
exports.DuplicateSSHPublicKeyException$ = DuplicateSSHPublicKeyException$;
exports.EnableMFADevice$ = EnableMFADevice$;
exports.EnableMFADeviceCommand = EnableMFADeviceCommand;
exports.EnableMFADeviceRequest$ = EnableMFADeviceRequest$;
exports.EnableOrganizationsRootCredentialsManagement$ = EnableOrganizationsRootCredentialsManagement$;
exports.EnableOrganizationsRootCredentialsManagementCommand = EnableOrganizationsRootCredentialsManagementCommand;
exports.EnableOrganizationsRootCredentialsManagementRequest$ = EnableOrganizationsRootCredentialsManagementRequest$;
exports.EnableOrganizationsRootCredentialsManagementResponse$ = EnableOrganizationsRootCredentialsManagementResponse$;
exports.EnableOrganizationsRootSessions$ = EnableOrganizationsRootSessions$;
exports.EnableOrganizationsRootSessionsCommand = EnableOrganizationsRootSessionsCommand;
exports.EnableOrganizationsRootSessionsRequest$ = EnableOrganizationsRootSessionsRequest$;
exports.EnableOrganizationsRootSessionsResponse$ = EnableOrganizationsRootSessionsResponse$;
exports.EnableOutboundWebIdentityFederation$ = EnableOutboundWebIdentityFederation$;
exports.EnableOutboundWebIdentityFederationCommand = EnableOutboundWebIdentityFederationCommand;
exports.EnableOutboundWebIdentityFederationResponse$ = EnableOutboundWebIdentityFederationResponse$;
exports.EncodingType = EncodingType;
exports.EntityAlreadyExistsException = EntityAlreadyExistsException;
exports.EntityAlreadyExistsException$ = EntityAlreadyExistsException$;
exports.EntityDetails$ = EntityDetails$;
exports.EntityInfo$ = EntityInfo$;
exports.EntityTemporarilyUnmodifiableException = EntityTemporarilyUnmodifiableException;
exports.EntityTemporarilyUnmodifiableException$ = EntityTemporarilyUnmodifiableException$;
exports.EntityType = EntityType;
exports.ErrorDetails$ = ErrorDetails$;
exports.EvaluationResult$ = EvaluationResult$;
exports.FeatureDisabledException = FeatureDisabledException;
exports.FeatureDisabledException$ = FeatureDisabledException$;
exports.FeatureEnabledException = FeatureEnabledException;
exports.FeatureEnabledException$ = FeatureEnabledException$;
exports.FeatureType = FeatureType;
exports.GenerateCredentialReport$ = GenerateCredentialReport$;
exports.GenerateCredentialReportCommand = GenerateCredentialReportCommand;
exports.GenerateCredentialReportResponse$ = GenerateCredentialReportResponse$;
exports.GenerateOrganizationsAccessReport$ = GenerateOrganizationsAccessReport$;
exports.GenerateOrganizationsAccessReportCommand = GenerateOrganizationsAccessReportCommand;
exports.GenerateOrganizationsAccessReportRequest$ = GenerateOrganizationsAccessReportRequest$;
exports.GenerateOrganizationsAccessReportResponse$ = GenerateOrganizationsAccessReportResponse$;
exports.GenerateServiceLastAccessedDetails$ = GenerateServiceLastAccessedDetails$;
exports.GenerateServiceLastAccessedDetailsCommand = GenerateServiceLastAccessedDetailsCommand;
exports.GenerateServiceLastAccessedDetailsRequest$ = GenerateServiceLastAccessedDetailsRequest$;
exports.GenerateServiceLastAccessedDetailsResponse$ = GenerateServiceLastAccessedDetailsResponse$;
exports.GetAccessKeyLastUsed$ = GetAccessKeyLastUsed$;
exports.GetAccessKeyLastUsedCommand = GetAccessKeyLastUsedCommand;
exports.GetAccessKeyLastUsedRequest$ = GetAccessKeyLastUsedRequest$;
exports.GetAccessKeyLastUsedResponse$ = GetAccessKeyLastUsedResponse$;
exports.GetAccountAuthorizationDetails$ = GetAccountAuthorizationDetails$;
exports.GetAccountAuthorizationDetailsCommand = GetAccountAuthorizationDetailsCommand;
exports.GetAccountAuthorizationDetailsRequest$ = GetAccountAuthorizationDetailsRequest$;
exports.GetAccountAuthorizationDetailsResponse$ = GetAccountAuthorizationDetailsResponse$;
exports.GetAccountPasswordPolicy$ = GetAccountPasswordPolicy$;
exports.GetAccountPasswordPolicyCommand = GetAccountPasswordPolicyCommand;
exports.GetAccountPasswordPolicyResponse$ = GetAccountPasswordPolicyResponse$;
exports.GetAccountSummary$ = GetAccountSummary$;
exports.GetAccountSummaryCommand = GetAccountSummaryCommand;
exports.GetAccountSummaryResponse$ = GetAccountSummaryResponse$;
exports.GetContextKeysForCustomPolicy$ = GetContextKeysForCustomPolicy$;
exports.GetContextKeysForCustomPolicyCommand = GetContextKeysForCustomPolicyCommand;
exports.GetContextKeysForCustomPolicyRequest$ = GetContextKeysForCustomPolicyRequest$;
exports.GetContextKeysForPolicyResponse$ = GetContextKeysForPolicyResponse$;
exports.GetContextKeysForPrincipalPolicy$ = GetContextKeysForPrincipalPolicy$;
exports.GetContextKeysForPrincipalPolicyCommand = GetContextKeysForPrincipalPolicyCommand;
exports.GetContextKeysForPrincipalPolicyRequest$ = GetContextKeysForPrincipalPolicyRequest$;
exports.GetCredentialReport$ = GetCredentialReport$;
exports.GetCredentialReportCommand = GetCredentialReportCommand;
exports.GetCredentialReportResponse$ = GetCredentialReportResponse$;
exports.GetDelegationRequest$ = GetDelegationRequest$;
exports.GetDelegationRequestCommand = GetDelegationRequestCommand;
exports.GetDelegationRequestRequest$ = GetDelegationRequestRequest$;
exports.GetDelegationRequestResponse$ = GetDelegationRequestResponse$;
exports.GetGroup$ = GetGroup$;
exports.GetGroupCommand = GetGroupCommand;
exports.GetGroupPolicy$ = GetGroupPolicy$;
exports.GetGroupPolicyCommand = GetGroupPolicyCommand;
exports.GetGroupPolicyRequest$ = GetGroupPolicyRequest$;
exports.GetGroupPolicyResponse$ = GetGroupPolicyResponse$;
exports.GetGroupRequest$ = GetGroupRequest$;
exports.GetGroupResponse$ = GetGroupResponse$;
exports.GetHumanReadableSummary$ = GetHumanReadableSummary$;
exports.GetHumanReadableSummaryCommand = GetHumanReadableSummaryCommand;
exports.GetHumanReadableSummaryRequest$ = GetHumanReadableSummaryRequest$;
exports.GetHumanReadableSummaryResponse$ = GetHumanReadableSummaryResponse$;
exports.GetInstanceProfile$ = GetInstanceProfile$;
exports.GetInstanceProfileCommand = GetInstanceProfileCommand;
exports.GetInstanceProfileRequest$ = GetInstanceProfileRequest$;
exports.GetInstanceProfileResponse$ = GetInstanceProfileResponse$;
exports.GetLoginProfile$ = GetLoginProfile$;
exports.GetLoginProfileCommand = GetLoginProfileCommand;
exports.GetLoginProfileRequest$ = GetLoginProfileRequest$;
exports.GetLoginProfileResponse$ = GetLoginProfileResponse$;
exports.GetMFADevice$ = GetMFADevice$;
exports.GetMFADeviceCommand = GetMFADeviceCommand;
exports.GetMFADeviceRequest$ = GetMFADeviceRequest$;
exports.GetMFADeviceResponse$ = GetMFADeviceResponse$;
exports.GetOpenIDConnectProvider$ = GetOpenIDConnectProvider$;
exports.GetOpenIDConnectProviderCommand = GetOpenIDConnectProviderCommand;
exports.GetOpenIDConnectProviderRequest$ = GetOpenIDConnectProviderRequest$;
exports.GetOpenIDConnectProviderResponse$ = GetOpenIDConnectProviderResponse$;
exports.GetOrganizationsAccessReport$ = GetOrganizationsAccessReport$;
exports.GetOrganizationsAccessReportCommand = GetOrganizationsAccessReportCommand;
exports.GetOrganizationsAccessReportRequest$ = GetOrganizationsAccessReportRequest$;
exports.GetOrganizationsAccessReportResponse$ = GetOrganizationsAccessReportResponse$;
exports.GetOutboundWebIdentityFederationInfo$ = GetOutboundWebIdentityFederationInfo$;
exports.GetOutboundWebIdentityFederationInfoCommand = GetOutboundWebIdentityFederationInfoCommand;
exports.GetOutboundWebIdentityFederationInfoResponse$ = GetOutboundWebIdentityFederationInfoResponse$;
exports.GetPolicy$ = GetPolicy$;
exports.GetPolicyCommand = GetPolicyCommand;
exports.GetPolicyRequest$ = GetPolicyRequest$;
exports.GetPolicyResponse$ = GetPolicyResponse$;
exports.GetPolicyVersion$ = GetPolicyVersion$;
exports.GetPolicyVersionCommand = GetPolicyVersionCommand;
exports.GetPolicyVersionRequest$ = GetPolicyVersionRequest$;
exports.GetPolicyVersionResponse$ = GetPolicyVersionResponse$;
exports.GetRole$ = GetRole$;
exports.GetRoleCommand = GetRoleCommand;
exports.GetRolePolicy$ = GetRolePolicy$;
exports.GetRolePolicyCommand = GetRolePolicyCommand;
exports.GetRolePolicyRequest$ = GetRolePolicyRequest$;
exports.GetRolePolicyResponse$ = GetRolePolicyResponse$;
exports.GetRoleRequest$ = GetRoleRequest$;
exports.GetRoleResponse$ = GetRoleResponse$;
exports.GetSAMLProvider$ = GetSAMLProvider$;
exports.GetSAMLProviderCommand = GetSAMLProviderCommand;
exports.GetSAMLProviderRequest$ = GetSAMLProviderRequest$;
exports.GetSAMLProviderResponse$ = GetSAMLProviderResponse$;
exports.GetSSHPublicKey$ = GetSSHPublicKey$;
exports.GetSSHPublicKeyCommand = GetSSHPublicKeyCommand;
exports.GetSSHPublicKeyRequest$ = GetSSHPublicKeyRequest$;
exports.GetSSHPublicKeyResponse$ = GetSSHPublicKeyResponse$;
exports.GetServerCertificate$ = GetServerCertificate$;
exports.GetServerCertificateCommand = GetServerCertificateCommand;
exports.GetServerCertificateRequest$ = GetServerCertificateRequest$;
exports.GetServerCertificateResponse$ = GetServerCertificateResponse$;
exports.GetServiceLastAccessedDetails$ = GetServiceLastAccessedDetails$;
exports.GetServiceLastAccessedDetailsCommand = GetServiceLastAccessedDetailsCommand;
exports.GetServiceLastAccessedDetailsRequest$ = GetServiceLastAccessedDetailsRequest$;
exports.GetServiceLastAccessedDetailsResponse$ = GetServiceLastAccessedDetailsResponse$;
exports.GetServiceLastAccessedDetailsWithEntities$ = GetServiceLastAccessedDetailsWithEntities$;
exports.GetServiceLastAccessedDetailsWithEntitiesCommand = GetServiceLastAccessedDetailsWithEntitiesCommand;
exports.GetServiceLastAccessedDetailsWithEntitiesRequest$ = GetServiceLastAccessedDetailsWithEntitiesRequest$;
exports.GetServiceLastAccessedDetailsWithEntitiesResponse$ = GetServiceLastAccessedDetailsWithEntitiesResponse$;
exports.GetServiceLinkedRoleDeletionStatus$ = GetServiceLinkedRoleDeletionStatus$;
exports.GetServiceLinkedRoleDeletionStatusCommand = GetServiceLinkedRoleDeletionStatusCommand;
exports.GetServiceLinkedRoleDeletionStatusRequest$ = GetServiceLinkedRoleDeletionStatusRequest$;
exports.GetServiceLinkedRoleDeletionStatusResponse$ = GetServiceLinkedRoleDeletionStatusResponse$;
exports.GetUser$ = GetUser$;
exports.GetUserCommand = GetUserCommand;
exports.GetUserPolicy$ = GetUserPolicy$;
exports.GetUserPolicyCommand = GetUserPolicyCommand;
exports.GetUserPolicyRequest$ = GetUserPolicyRequest$;
exports.GetUserPolicyResponse$ = GetUserPolicyResponse$;
exports.GetUserRequest$ = GetUserRequest$;
exports.GetUserResponse$ = GetUserResponse$;
exports.GlobalEndpointTokenVersion = GlobalEndpointTokenVersion;
exports.Group$ = Group$;
exports.GroupDetail$ = GroupDetail$;
exports.IAM = IAM;
exports.IAMClient = IAMClient;
exports.IAMServiceException = IAMServiceException;
exports.IAMServiceException$ = IAMServiceException$;
exports.InstanceProfile$ = InstanceProfile$;
exports.InvalidAuthenticationCodeException = InvalidAuthenticationCodeException;
exports.InvalidAuthenticationCodeException$ = InvalidAuthenticationCodeException$;
exports.InvalidCertificateException = InvalidCertificateException;
exports.InvalidCertificateException$ = InvalidCertificateException$;
exports.InvalidInputException = InvalidInputException;
exports.InvalidInputException$ = InvalidInputException$;
exports.InvalidPublicKeyException = InvalidPublicKeyException;
exports.InvalidPublicKeyException$ = InvalidPublicKeyException$;
exports.InvalidUserTypeException = InvalidUserTypeException;
exports.InvalidUserTypeException$ = InvalidUserTypeException$;
exports.JobStatusType = JobStatusType;
exports.KeyPairMismatchException = KeyPairMismatchException;
exports.KeyPairMismatchException$ = KeyPairMismatchException$;
exports.LimitExceededException = LimitExceededException;
exports.LimitExceededException$ = LimitExceededException$;
exports.ListAccessKeys$ = ListAccessKeys$;
exports.ListAccessKeysCommand = ListAccessKeysCommand;
exports.ListAccessKeysRequest$ = ListAccessKeysRequest$;
exports.ListAccessKeysResponse$ = ListAccessKeysResponse$;
exports.ListAccountAliases$ = ListAccountAliases$;
exports.ListAccountAliasesCommand = ListAccountAliasesCommand;
exports.ListAccountAliasesRequest$ = ListAccountAliasesRequest$;
exports.ListAccountAliasesResponse$ = ListAccountAliasesResponse$;
exports.ListAttachedGroupPolicies$ = ListAttachedGroupPolicies$;
exports.ListAttachedGroupPoliciesCommand = ListAttachedGroupPoliciesCommand;
exports.ListAttachedGroupPoliciesRequest$ = ListAttachedGroupPoliciesRequest$;
exports.ListAttachedGroupPoliciesResponse$ = ListAttachedGroupPoliciesResponse$;
exports.ListAttachedRolePolicies$ = ListAttachedRolePolicies$;
exports.ListAttachedRolePoliciesCommand = ListAttachedRolePoliciesCommand;
exports.ListAttachedRolePoliciesRequest$ = ListAttachedRolePoliciesRequest$;
exports.ListAttachedRolePoliciesResponse$ = ListAttachedRolePoliciesResponse$;
exports.ListAttachedUserPolicies$ = ListAttachedUserPolicies$;
exports.ListAttachedUserPoliciesCommand = ListAttachedUserPoliciesCommand;
exports.ListAttachedUserPoliciesRequest$ = ListAttachedUserPoliciesRequest$;
exports.ListAttachedUserPoliciesResponse$ = ListAttachedUserPoliciesResponse$;
exports.ListDelegationRequests$ = ListDelegationRequests$;
exports.ListDelegationRequestsCommand = ListDelegationRequestsCommand;
exports.ListDelegationRequestsRequest$ = ListDelegationRequestsRequest$;
exports.ListDelegationRequestsResponse$ = ListDelegationRequestsResponse$;
exports.ListEntitiesForPolicy$ = ListEntitiesForPolicy$;
exports.ListEntitiesForPolicyCommand = ListEntitiesForPolicyCommand;
exports.ListEntitiesForPolicyRequest$ = ListEntitiesForPolicyRequest$;
exports.ListEntitiesForPolicyResponse$ = ListEntitiesForPolicyResponse$;
exports.ListGroupPolicies$ = ListGroupPolicies$;
exports.ListGroupPoliciesCommand = ListGroupPoliciesCommand;
exports.ListGroupPoliciesRequest$ = ListGroupPoliciesRequest$;
exports.ListGroupPoliciesResponse$ = ListGroupPoliciesResponse$;
exports.ListGroups$ = ListGroups$;
exports.ListGroupsCommand = ListGroupsCommand;
exports.ListGroupsForUser$ = ListGroupsForUser$;
exports.ListGroupsForUserCommand = ListGroupsForUserCommand;
exports.ListGroupsForUserRequest$ = ListGroupsForUserRequest$;
exports.ListGroupsForUserResponse$ = ListGroupsForUserResponse$;
exports.ListGroupsRequest$ = ListGroupsRequest$;
exports.ListGroupsResponse$ = ListGroupsResponse$;
exports.ListInstanceProfileTags$ = ListInstanceProfileTags$;
exports.ListInstanceProfileTagsCommand = ListInstanceProfileTagsCommand;
exports.ListInstanceProfileTagsRequest$ = ListInstanceProfileTagsRequest$;
exports.ListInstanceProfileTagsResponse$ = ListInstanceProfileTagsResponse$;
exports.ListInstanceProfiles$ = ListInstanceProfiles$;
exports.ListInstanceProfilesCommand = ListInstanceProfilesCommand;
exports.ListInstanceProfilesForRole$ = ListInstanceProfilesForRole$;
exports.ListInstanceProfilesForRoleCommand = ListInstanceProfilesForRoleCommand;
exports.ListInstanceProfilesForRoleRequest$ = ListInstanceProfilesForRoleRequest$;
exports.ListInstanceProfilesForRoleResponse$ = ListInstanceProfilesForRoleResponse$;
exports.ListInstanceProfilesRequest$ = ListInstanceProfilesRequest$;
exports.ListInstanceProfilesResponse$ = ListInstanceProfilesResponse$;
exports.ListMFADeviceTags$ = ListMFADeviceTags$;
exports.ListMFADeviceTagsCommand = ListMFADeviceTagsCommand;
exports.ListMFADeviceTagsRequest$ = ListMFADeviceTagsRequest$;
exports.ListMFADeviceTagsResponse$ = ListMFADeviceTagsResponse$;
exports.ListMFADevices$ = ListMFADevices$;
exports.ListMFADevicesCommand = ListMFADevicesCommand;
exports.ListMFADevicesRequest$ = ListMFADevicesRequest$;
exports.ListMFADevicesResponse$ = ListMFADevicesResponse$;
exports.ListOpenIDConnectProviderTags$ = ListOpenIDConnectProviderTags$;
exports.ListOpenIDConnectProviderTagsCommand = ListOpenIDConnectProviderTagsCommand;
exports.ListOpenIDConnectProviderTagsRequest$ = ListOpenIDConnectProviderTagsRequest$;
exports.ListOpenIDConnectProviderTagsResponse$ = ListOpenIDConnectProviderTagsResponse$;
exports.ListOpenIDConnectProviders$ = ListOpenIDConnectProviders$;
exports.ListOpenIDConnectProvidersCommand = ListOpenIDConnectProvidersCommand;
exports.ListOpenIDConnectProvidersRequest$ = ListOpenIDConnectProvidersRequest$;
exports.ListOpenIDConnectProvidersResponse$ = ListOpenIDConnectProvidersResponse$;
exports.ListOrganizationsFeatures$ = ListOrganizationsFeatures$;
exports.ListOrganizationsFeaturesCommand = ListOrganizationsFeaturesCommand;
exports.ListOrganizationsFeaturesRequest$ = ListOrganizationsFeaturesRequest$;
exports.ListOrganizationsFeaturesResponse$ = ListOrganizationsFeaturesResponse$;
exports.ListPolicies$ = ListPolicies$;
exports.ListPoliciesCommand = ListPoliciesCommand;
exports.ListPoliciesGrantingServiceAccess$ = ListPoliciesGrantingServiceAccess$;
exports.ListPoliciesGrantingServiceAccessCommand = ListPoliciesGrantingServiceAccessCommand;
exports.ListPoliciesGrantingServiceAccessEntry$ = ListPoliciesGrantingServiceAccessEntry$;
exports.ListPoliciesGrantingServiceAccessRequest$ = ListPoliciesGrantingServiceAccessRequest$;
exports.ListPoliciesGrantingServiceAccessResponse$ = ListPoliciesGrantingServiceAccessResponse$;
exports.ListPoliciesRequest$ = ListPoliciesRequest$;
exports.ListPoliciesResponse$ = ListPoliciesResponse$;
exports.ListPolicyTags$ = ListPolicyTags$;
exports.ListPolicyTagsCommand = ListPolicyTagsCommand;
exports.ListPolicyTagsRequest$ = ListPolicyTagsRequest$;
exports.ListPolicyTagsResponse$ = ListPolicyTagsResponse$;
exports.ListPolicyVersions$ = ListPolicyVersions$;
exports.ListPolicyVersionsCommand = ListPolicyVersionsCommand;
exports.ListPolicyVersionsRequest$ = ListPolicyVersionsRequest$;
exports.ListPolicyVersionsResponse$ = ListPolicyVersionsResponse$;
exports.ListRolePolicies$ = ListRolePolicies$;
exports.ListRolePoliciesCommand = ListRolePoliciesCommand;
exports.ListRolePoliciesRequest$ = ListRolePoliciesRequest$;
exports.ListRolePoliciesResponse$ = ListRolePoliciesResponse$;
exports.ListRoleTags$ = ListRoleTags$;
exports.ListRoleTagsCommand = ListRoleTagsCommand;
exports.ListRoleTagsRequest$ = ListRoleTagsRequest$;
exports.ListRoleTagsResponse$ = ListRoleTagsResponse$;
exports.ListRoles$ = ListRoles$;
exports.ListRolesCommand = ListRolesCommand;
exports.ListRolesRequest$ = ListRolesRequest$;
exports.ListRolesResponse$ = ListRolesResponse$;
exports.ListSAMLProviderTags$ = ListSAMLProviderTags$;
exports.ListSAMLProviderTagsCommand = ListSAMLProviderTagsCommand;
exports.ListSAMLProviderTagsRequest$ = ListSAMLProviderTagsRequest$;
exports.ListSAMLProviderTagsResponse$ = ListSAMLProviderTagsResponse$;
exports.ListSAMLProviders$ = ListSAMLProviders$;
exports.ListSAMLProvidersCommand = ListSAMLProvidersCommand;
exports.ListSAMLProvidersRequest$ = ListSAMLProvidersRequest$;
exports.ListSAMLProvidersResponse$ = ListSAMLProvidersResponse$;
exports.ListSSHPublicKeys$ = ListSSHPublicKeys$;
exports.ListSSHPublicKeysCommand = ListSSHPublicKeysCommand;
exports.ListSSHPublicKeysRequest$ = ListSSHPublicKeysRequest$;
exports.ListSSHPublicKeysResponse$ = ListSSHPublicKeysResponse$;
exports.ListServerCertificateTags$ = ListServerCertificateTags$;
exports.ListServerCertificateTagsCommand = ListServerCertificateTagsCommand;
exports.ListServerCertificateTagsRequest$ = ListServerCertificateTagsRequest$;
exports.ListServerCertificateTagsResponse$ = ListServerCertificateTagsResponse$;
exports.ListServerCertificates$ = ListServerCertificates$;
exports.ListServerCertificatesCommand = ListServerCertificatesCommand;
exports.ListServerCertificatesRequest$ = ListServerCertificatesRequest$;
exports.ListServerCertificatesResponse$ = ListServerCertificatesResponse$;
exports.ListServiceSpecificCredentials$ = ListServiceSpecificCredentials$;
exports.ListServiceSpecificCredentialsCommand = ListServiceSpecificCredentialsCommand;
exports.ListServiceSpecificCredentialsRequest$ = ListServiceSpecificCredentialsRequest$;
exports.ListServiceSpecificCredentialsResponse$ = ListServiceSpecificCredentialsResponse$;
exports.ListSigningCertificates$ = ListSigningCertificates$;
exports.ListSigningCertificatesCommand = ListSigningCertificatesCommand;
exports.ListSigningCertificatesRequest$ = ListSigningCertificatesRequest$;
exports.ListSigningCertificatesResponse$ = ListSigningCertificatesResponse$;
exports.ListUserPolicies$ = ListUserPolicies$;
exports.ListUserPoliciesCommand = ListUserPoliciesCommand;
exports.ListUserPoliciesRequest$ = ListUserPoliciesRequest$;
exports.ListUserPoliciesResponse$ = ListUserPoliciesResponse$;
exports.ListUserTags$ = ListUserTags$;
exports.ListUserTagsCommand = ListUserTagsCommand;
exports.ListUserTagsRequest$ = ListUserTagsRequest$;
exports.ListUserTagsResponse$ = ListUserTagsResponse$;
exports.ListUsers$ = ListUsers$;
exports.ListUsersCommand = ListUsersCommand;
exports.ListUsersRequest$ = ListUsersRequest$;
exports.ListUsersResponse$ = ListUsersResponse$;
exports.ListVirtualMFADevices$ = ListVirtualMFADevices$;
exports.ListVirtualMFADevicesCommand = ListVirtualMFADevicesCommand;
exports.ListVirtualMFADevicesRequest$ = ListVirtualMFADevicesRequest$;
exports.ListVirtualMFADevicesResponse$ = ListVirtualMFADevicesResponse$;
exports.LoginProfile$ = LoginProfile$;
exports.MFADevice$ = MFADevice$;
exports.MalformedCertificateException = MalformedCertificateException;
exports.MalformedCertificateException$ = MalformedCertificateException$;
exports.MalformedPolicyDocumentException = MalformedPolicyDocumentException;
exports.MalformedPolicyDocumentException$ = MalformedPolicyDocumentException$;
exports.ManagedPolicyDetail$ = ManagedPolicyDetail$;
exports.NoSuchEntityException = NoSuchEntityException;
exports.NoSuchEntityException$ = NoSuchEntityException$;
exports.OpenIDConnectProviderListEntry$ = OpenIDConnectProviderListEntry$;
exports.OpenIdIdpCommunicationErrorException = OpenIdIdpCommunicationErrorException;
exports.OpenIdIdpCommunicationErrorException$ = OpenIdIdpCommunicationErrorException$;
exports.OrganizationNotFoundException = OrganizationNotFoundException;
exports.OrganizationNotFoundException$ = OrganizationNotFoundException$;
exports.OrganizationNotInAllFeaturesModeException = OrganizationNotInAllFeaturesModeException;
exports.OrganizationNotInAllFeaturesModeException$ = OrganizationNotInAllFeaturesModeException$;
exports.OrganizationsDecisionDetail$ = OrganizationsDecisionDetail$;
exports.PasswordPolicy$ = PasswordPolicy$;
exports.PasswordPolicyViolationException = PasswordPolicyViolationException;
exports.PasswordPolicyViolationException$ = PasswordPolicyViolationException$;
exports.PermissionCheckResultType = PermissionCheckResultType;
exports.PermissionCheckStatusType = PermissionCheckStatusType;
exports.PermissionsBoundaryAttachmentType = PermissionsBoundaryAttachmentType;
exports.PermissionsBoundaryDecisionDetail$ = PermissionsBoundaryDecisionDetail$;
exports.Policy$ = Policy$;
exports.PolicyDetail$ = PolicyDetail$;
exports.PolicyEvaluationDecisionType = PolicyEvaluationDecisionType;
exports.PolicyEvaluationException = PolicyEvaluationException;
exports.PolicyEvaluationException$ = PolicyEvaluationException$;
exports.PolicyGrantingServiceAccess$ = PolicyGrantingServiceAccess$;
exports.PolicyGroup$ = PolicyGroup$;
exports.PolicyNotAttachableException = PolicyNotAttachableException;
exports.PolicyNotAttachableException$ = PolicyNotAttachableException$;
exports.PolicyOwnerEntityType = PolicyOwnerEntityType;
exports.PolicyParameter$ = PolicyParameter$;
exports.PolicyParameterTypeEnum = PolicyParameterTypeEnum;
exports.PolicyRole$ = PolicyRole$;
exports.PolicyScopeType = PolicyScopeType;
exports.PolicySourceType = PolicySourceType;
exports.PolicyType = PolicyType;
exports.PolicyUsageType = PolicyUsageType;
exports.PolicyUser$ = PolicyUser$;
exports.PolicyVersion$ = PolicyVersion$;
exports.Position$ = Position$;
exports.PutGroupPolicy$ = PutGroupPolicy$;
exports.PutGroupPolicyCommand = PutGroupPolicyCommand;
exports.PutGroupPolicyRequest$ = PutGroupPolicyRequest$;
exports.PutRolePermissionsBoundary$ = PutRolePermissionsBoundary$;
exports.PutRolePermissionsBoundaryCommand = PutRolePermissionsBoundaryCommand;
exports.PutRolePermissionsBoundaryRequest$ = PutRolePermissionsBoundaryRequest$;
exports.PutRolePolicy$ = PutRolePolicy$;
exports.PutRolePolicyCommand = PutRolePolicyCommand;
exports.PutRolePolicyRequest$ = PutRolePolicyRequest$;
exports.PutUserPermissionsBoundary$ = PutUserPermissionsBoundary$;
exports.PutUserPermissionsBoundaryCommand = PutUserPermissionsBoundaryCommand;
exports.PutUserPermissionsBoundaryRequest$ = PutUserPermissionsBoundaryRequest$;
exports.PutUserPolicy$ = PutUserPolicy$;
exports.PutUserPolicyCommand = PutUserPolicyCommand;
exports.PutUserPolicyRequest$ = PutUserPolicyRequest$;
exports.RejectDelegationRequest$ = RejectDelegationRequest$;
exports.RejectDelegationRequestCommand = RejectDelegationRequestCommand;
exports.RejectDelegationRequestRequest$ = RejectDelegationRequestRequest$;
exports.RemoveClientIDFromOpenIDConnectProvider$ = RemoveClientIDFromOpenIDConnectProvider$;
exports.RemoveClientIDFromOpenIDConnectProviderCommand = RemoveClientIDFromOpenIDConnectProviderCommand;
exports.RemoveClientIDFromOpenIDConnectProviderRequest$ = RemoveClientIDFromOpenIDConnectProviderRequest$;
exports.RemoveRoleFromInstanceProfile$ = RemoveRoleFromInstanceProfile$;
exports.RemoveRoleFromInstanceProfileCommand = RemoveRoleFromInstanceProfileCommand;
exports.RemoveRoleFromInstanceProfileRequest$ = RemoveRoleFromInstanceProfileRequest$;
exports.RemoveUserFromGroup$ = RemoveUserFromGroup$;
exports.RemoveUserFromGroupCommand = RemoveUserFromGroupCommand;
exports.RemoveUserFromGroupRequest$ = RemoveUserFromGroupRequest$;
exports.ReportFormatType = ReportFormatType;
exports.ReportGenerationLimitExceededException = ReportGenerationLimitExceededException;
exports.ReportGenerationLimitExceededException$ = ReportGenerationLimitExceededException$;
exports.ReportStateType = ReportStateType;
exports.ResetServiceSpecificCredential$ = ResetServiceSpecificCredential$;
exports.ResetServiceSpecificCredentialCommand = ResetServiceSpecificCredentialCommand;
exports.ResetServiceSpecificCredentialRequest$ = ResetServiceSpecificCredentialRequest$;
exports.ResetServiceSpecificCredentialResponse$ = ResetServiceSpecificCredentialResponse$;
exports.ResourceSpecificResult$ = ResourceSpecificResult$;
exports.ResyncMFADevice$ = ResyncMFADevice$;
exports.ResyncMFADeviceCommand = ResyncMFADeviceCommand;
exports.ResyncMFADeviceRequest$ = ResyncMFADeviceRequest$;
exports.Role$ = Role$;
exports.RoleDetail$ = RoleDetail$;
exports.RoleLastUsed$ = RoleLastUsed$;
exports.RoleUsageType$ = RoleUsageType$;
exports.SAMLPrivateKey$ = SAMLPrivateKey$;
exports.SAMLProviderListEntry$ = SAMLProviderListEntry$;
exports.SSHPublicKey$ = SSHPublicKey$;
exports.SSHPublicKeyMetadata$ = SSHPublicKeyMetadata$;
exports.SendDelegationToken$ = SendDelegationToken$;
exports.SendDelegationTokenCommand = SendDelegationTokenCommand;
exports.SendDelegationTokenRequest$ = SendDelegationTokenRequest$;
exports.ServerCertificate$ = ServerCertificate$;
exports.ServerCertificateMetadata$ = ServerCertificateMetadata$;
exports.ServiceAccessNotEnabledException = ServiceAccessNotEnabledException;
exports.ServiceAccessNotEnabledException$ = ServiceAccessNotEnabledException$;
exports.ServiceFailureException = ServiceFailureException;
exports.ServiceFailureException$ = ServiceFailureException$;
exports.ServiceLastAccessed$ = ServiceLastAccessed$;
exports.ServiceNotSupportedException = ServiceNotSupportedException;
exports.ServiceNotSupportedException$ = ServiceNotSupportedException$;
exports.ServiceSpecificCredential$ = ServiceSpecificCredential$;
exports.ServiceSpecificCredentialMetadata$ = ServiceSpecificCredentialMetadata$;
exports.SetDefaultPolicyVersion$ = SetDefaultPolicyVersion$;
exports.SetDefaultPolicyVersionCommand = SetDefaultPolicyVersionCommand;
exports.SetDefaultPolicyVersionRequest$ = SetDefaultPolicyVersionRequest$;
exports.SetSecurityTokenServicePreferences$ = SetSecurityTokenServicePreferences$;
exports.SetSecurityTokenServicePreferencesCommand = SetSecurityTokenServicePreferencesCommand;
exports.SetSecurityTokenServicePreferencesRequest$ = SetSecurityTokenServicePreferencesRequest$;
exports.SigningCertificate$ = SigningCertificate$;
exports.SimulateCustomPolicy$ = SimulateCustomPolicy$;
exports.SimulateCustomPolicyCommand = SimulateCustomPolicyCommand;
exports.SimulateCustomPolicyRequest$ = SimulateCustomPolicyRequest$;
exports.SimulatePolicyResponse$ = SimulatePolicyResponse$;
exports.SimulatePrincipalPolicy$ = SimulatePrincipalPolicy$;
exports.SimulatePrincipalPolicyCommand = SimulatePrincipalPolicyCommand;
exports.SimulatePrincipalPolicyRequest$ = SimulatePrincipalPolicyRequest$;
exports.SortKeyType = SortKeyType;
exports.StateType = StateType;
exports.Statement$ = Statement$;
exports.StatusType = StatusType;
exports.SummaryKeyType = SummaryKeyType;
exports.SummaryStateType = SummaryStateType;
exports.Tag$ = Tag$;
exports.TagInstanceProfile$ = TagInstanceProfile$;
exports.TagInstanceProfileCommand = TagInstanceProfileCommand;
exports.TagInstanceProfileRequest$ = TagInstanceProfileRequest$;
exports.TagMFADevice$ = TagMFADevice$;
exports.TagMFADeviceCommand = TagMFADeviceCommand;
exports.TagMFADeviceRequest$ = TagMFADeviceRequest$;
exports.TagOpenIDConnectProvider$ = TagOpenIDConnectProvider$;
exports.TagOpenIDConnectProviderCommand = TagOpenIDConnectProviderCommand;
exports.TagOpenIDConnectProviderRequest$ = TagOpenIDConnectProviderRequest$;
exports.TagPolicy$ = TagPolicy$;
exports.TagPolicyCommand = TagPolicyCommand;
exports.TagPolicyRequest$ = TagPolicyRequest$;
exports.TagRole$ = TagRole$;
exports.TagRoleCommand = TagRoleCommand;
exports.TagRoleRequest$ = TagRoleRequest$;
exports.TagSAMLProvider$ = TagSAMLProvider$;
exports.TagSAMLProviderCommand = TagSAMLProviderCommand;
exports.TagSAMLProviderRequest$ = TagSAMLProviderRequest$;
exports.TagServerCertificate$ = TagServerCertificate$;
exports.TagServerCertificateCommand = TagServerCertificateCommand;
exports.TagServerCertificateRequest$ = TagServerCertificateRequest$;
exports.TagUser$ = TagUser$;
exports.TagUserCommand = TagUserCommand;
exports.TagUserRequest$ = TagUserRequest$;
exports.TrackedActionLastAccessed$ = TrackedActionLastAccessed$;
exports.UnmodifiableEntityException = UnmodifiableEntityException;
exports.UnmodifiableEntityException$ = UnmodifiableEntityException$;
exports.UnrecognizedPublicKeyEncodingException = UnrecognizedPublicKeyEncodingException;
exports.UnrecognizedPublicKeyEncodingException$ = UnrecognizedPublicKeyEncodingException$;
exports.UntagInstanceProfile$ = UntagInstanceProfile$;
exports.UntagInstanceProfileCommand = UntagInstanceProfileCommand;
exports.UntagInstanceProfileRequest$ = UntagInstanceProfileRequest$;
exports.UntagMFADevice$ = UntagMFADevice$;
exports.UntagMFADeviceCommand = UntagMFADeviceCommand;
exports.UntagMFADeviceRequest$ = UntagMFADeviceRequest$;
exports.UntagOpenIDConnectProvider$ = UntagOpenIDConnectProvider$;
exports.UntagOpenIDConnectProviderCommand = UntagOpenIDConnectProviderCommand;
exports.UntagOpenIDConnectProviderRequest$ = UntagOpenIDConnectProviderRequest$;
exports.UntagPolicy$ = UntagPolicy$;
exports.UntagPolicyCommand = UntagPolicyCommand;
exports.UntagPolicyRequest$ = UntagPolicyRequest$;
exports.UntagRole$ = UntagRole$;
exports.UntagRoleCommand = UntagRoleCommand;
exports.UntagRoleRequest$ = UntagRoleRequest$;
exports.UntagSAMLProvider$ = UntagSAMLProvider$;
exports.UntagSAMLProviderCommand = UntagSAMLProviderCommand;
exports.UntagSAMLProviderRequest$ = UntagSAMLProviderRequest$;
exports.UntagServerCertificate$ = UntagServerCertificate$;
exports.UntagServerCertificateCommand = UntagServerCertificateCommand;
exports.UntagServerCertificateRequest$ = UntagServerCertificateRequest$;
exports.UntagUser$ = UntagUser$;
exports.UntagUserCommand = UntagUserCommand;
exports.UntagUserRequest$ = UntagUserRequest$;
exports.UpdateAccessKey$ = UpdateAccessKey$;
exports.UpdateAccessKeyCommand = UpdateAccessKeyCommand;
exports.UpdateAccessKeyRequest$ = UpdateAccessKeyRequest$;
exports.UpdateAccountPasswordPolicy$ = UpdateAccountPasswordPolicy$;
exports.UpdateAccountPasswordPolicyCommand = UpdateAccountPasswordPolicyCommand;
exports.UpdateAccountPasswordPolicyRequest$ = UpdateAccountPasswordPolicyRequest$;
exports.UpdateAssumeRolePolicy$ = UpdateAssumeRolePolicy$;
exports.UpdateAssumeRolePolicyCommand = UpdateAssumeRolePolicyCommand;
exports.UpdateAssumeRolePolicyRequest$ = UpdateAssumeRolePolicyRequest$;
exports.UpdateDelegationRequest$ = UpdateDelegationRequest$;
exports.UpdateDelegationRequestCommand = UpdateDelegationRequestCommand;
exports.UpdateDelegationRequestRequest$ = UpdateDelegationRequestRequest$;
exports.UpdateGroup$ = UpdateGroup$;
exports.UpdateGroupCommand = UpdateGroupCommand;
exports.UpdateGroupRequest$ = UpdateGroupRequest$;
exports.UpdateLoginProfile$ = UpdateLoginProfile$;
exports.UpdateLoginProfileCommand = UpdateLoginProfileCommand;
exports.UpdateLoginProfileRequest$ = UpdateLoginProfileRequest$;
exports.UpdateOpenIDConnectProviderThumbprint$ = UpdateOpenIDConnectProviderThumbprint$;
exports.UpdateOpenIDConnectProviderThumbprintCommand = UpdateOpenIDConnectProviderThumbprintCommand;
exports.UpdateOpenIDConnectProviderThumbprintRequest$ = UpdateOpenIDConnectProviderThumbprintRequest$;
exports.UpdateRole$ = UpdateRole$;
exports.UpdateRoleCommand = UpdateRoleCommand;
exports.UpdateRoleDescription$ = UpdateRoleDescription$;
exports.UpdateRoleDescriptionCommand = UpdateRoleDescriptionCommand;
exports.UpdateRoleDescriptionRequest$ = UpdateRoleDescriptionRequest$;
exports.UpdateRoleDescriptionResponse$ = UpdateRoleDescriptionResponse$;
exports.UpdateRoleRequest$ = UpdateRoleRequest$;
exports.UpdateRoleResponse$ = UpdateRoleResponse$;
exports.UpdateSAMLProvider$ = UpdateSAMLProvider$;
exports.UpdateSAMLProviderCommand = UpdateSAMLProviderCommand;
exports.UpdateSAMLProviderRequest$ = UpdateSAMLProviderRequest$;
exports.UpdateSAMLProviderResponse$ = UpdateSAMLProviderResponse$;
exports.UpdateSSHPublicKey$ = UpdateSSHPublicKey$;
exports.UpdateSSHPublicKeyCommand = UpdateSSHPublicKeyCommand;
exports.UpdateSSHPublicKeyRequest$ = UpdateSSHPublicKeyRequest$;
exports.UpdateServerCertificate$ = UpdateServerCertificate$;
exports.UpdateServerCertificateCommand = UpdateServerCertificateCommand;
exports.UpdateServerCertificateRequest$ = UpdateServerCertificateRequest$;
exports.UpdateServiceSpecificCredential$ = UpdateServiceSpecificCredential$;
exports.UpdateServiceSpecificCredentialCommand = UpdateServiceSpecificCredentialCommand;
exports.UpdateServiceSpecificCredentialRequest$ = UpdateServiceSpecificCredentialRequest$;
exports.UpdateSigningCertificate$ = UpdateSigningCertificate$;
exports.UpdateSigningCertificateCommand = UpdateSigningCertificateCommand;
exports.UpdateSigningCertificateRequest$ = UpdateSigningCertificateRequest$;
exports.UpdateUser$ = UpdateUser$;
exports.UpdateUserCommand = UpdateUserCommand;
exports.UpdateUserRequest$ = UpdateUserRequest$;
exports.UploadSSHPublicKey$ = UploadSSHPublicKey$;
exports.UploadSSHPublicKeyCommand = UploadSSHPublicKeyCommand;
exports.UploadSSHPublicKeyRequest$ = UploadSSHPublicKeyRequest$;
exports.UploadSSHPublicKeyResponse$ = UploadSSHPublicKeyResponse$;
exports.UploadServerCertificate$ = UploadServerCertificate$;
exports.UploadServerCertificateCommand = UploadServerCertificateCommand;
exports.UploadServerCertificateRequest$ = UploadServerCertificateRequest$;
exports.UploadServerCertificateResponse$ = UploadServerCertificateResponse$;
exports.UploadSigningCertificate$ = UploadSigningCertificate$;
exports.UploadSigningCertificateCommand = UploadSigningCertificateCommand;
exports.UploadSigningCertificateRequest$ = UploadSigningCertificateRequest$;
exports.UploadSigningCertificateResponse$ = UploadSigningCertificateResponse$;
exports.User$ = User$;
exports.UserDetail$ = UserDetail$;
exports.VirtualMFADevice$ = VirtualMFADevice$;
exports.paginateGetAccountAuthorizationDetails = paginateGetAccountAuthorizationDetails;
exports.paginateGetGroup = paginateGetGroup;
exports.paginateListAccessKeys = paginateListAccessKeys;
exports.paginateListAccountAliases = paginateListAccountAliases;
exports.paginateListAttachedGroupPolicies = paginateListAttachedGroupPolicies;
exports.paginateListAttachedRolePolicies = paginateListAttachedRolePolicies;
exports.paginateListAttachedUserPolicies = paginateListAttachedUserPolicies;
exports.paginateListEntitiesForPolicy = paginateListEntitiesForPolicy;
exports.paginateListGroupPolicies = paginateListGroupPolicies;
exports.paginateListGroups = paginateListGroups;
exports.paginateListGroupsForUser = paginateListGroupsForUser;
exports.paginateListInstanceProfileTags = paginateListInstanceProfileTags;
exports.paginateListInstanceProfiles = paginateListInstanceProfiles;
exports.paginateListInstanceProfilesForRole = paginateListInstanceProfilesForRole;
exports.paginateListMFADeviceTags = paginateListMFADeviceTags;
exports.paginateListMFADevices = paginateListMFADevices;
exports.paginateListOpenIDConnectProviderTags = paginateListOpenIDConnectProviderTags;
exports.paginateListPolicies = paginateListPolicies;
exports.paginateListPolicyTags = paginateListPolicyTags;
exports.paginateListPolicyVersions = paginateListPolicyVersions;
exports.paginateListRolePolicies = paginateListRolePolicies;
exports.paginateListRoleTags = paginateListRoleTags;
exports.paginateListRoles = paginateListRoles;
exports.paginateListSAMLProviderTags = paginateListSAMLProviderTags;
exports.paginateListSSHPublicKeys = paginateListSSHPublicKeys;
exports.paginateListServerCertificateTags = paginateListServerCertificateTags;
exports.paginateListServerCertificates = paginateListServerCertificates;
exports.paginateListSigningCertificates = paginateListSigningCertificates;
exports.paginateListUserPolicies = paginateListUserPolicies;
exports.paginateListUserTags = paginateListUserTags;
exports.paginateListUsers = paginateListUsers;
exports.paginateListVirtualMFADevices = paginateListVirtualMFADevices;
exports.paginateSimulateCustomPolicy = paginateSimulateCustomPolicy;
exports.paginateSimulatePrincipalPolicy = paginateSimulatePrincipalPolicy;
exports.waitForInstanceProfileExists = waitForInstanceProfileExists;
exports.waitForPolicyExists = waitForPolicyExists;
exports.waitForRoleExists = waitForRoleExists;
exports.waitForUserExists = waitForUserExists;
exports.waitUntilInstanceProfileExists = waitUntilInstanceProfileExists;
exports.waitUntilPolicyExists = waitUntilPolicyExists;
exports.waitUntilRoleExists = waitUntilRoleExists;
exports.waitUntilUserExists = waitUntilUserExists;
