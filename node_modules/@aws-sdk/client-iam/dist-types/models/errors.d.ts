import type { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { IAMServiceException as __BaseException } from "./IAMServiceException";
/**
 * <p>The request was rejected because multiple requests to change this object were submitted
 *       simultaneously. Wait a few minutes and submit your request again.</p>
 * @public
 */
export declare class ConcurrentModificationException extends __BaseException {
    readonly name: "ConcurrentModificationException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConcurrentModificationException, __BaseException>);
}
/**
 * <p>The request was rejected because it referenced a resource entity that does not exist. The
 *       error message describes the resource.</p>
 * @public
 */
export declare class NoSuchEntityException extends __BaseException {
    readonly name: "NoSuchEntityException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<NoSuchEntityException, __BaseException>);
}
/**
 * <p>The request processing has failed because of an unknown error, exception or
 *       failure.</p>
 * @public
 */
export declare class ServiceFailureException extends __BaseException {
    readonly name: "ServiceFailureException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceFailureException, __BaseException>);
}
/**
 * <p>The request was rejected because the account making the request is not the management
 *       account or delegated administrator account for <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html#id_root-user-access-management">centralized root
 *         access</a>.</p>
 * @public
 */
export declare class AccountNotManagementOrDelegatedAdministratorException extends __BaseException {
    readonly name: "AccountNotManagementOrDelegatedAdministratorException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccountNotManagementOrDelegatedAdministratorException, __BaseException>);
}
/**
 * <p>The request was rejected because an invalid or out-of-range value was supplied for an
 *       input parameter.</p>
 * @public
 */
export declare class InvalidInputException extends __BaseException {
    readonly name: "InvalidInputException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidInputException, __BaseException>);
}
/**
 * <p>The request was rejected because it attempted to create resources beyond the current
 *       Amazon Web Services account limits. The error message describes the limit exceeded.</p>
 * @public
 */
export declare class LimitExceededException extends __BaseException {
    readonly name: "LimitExceededException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<LimitExceededException, __BaseException>);
}
/**
 * <p>The request was rejected because it attempted to create a resource that already
 *       exists.</p>
 * @public
 */
export declare class EntityAlreadyExistsException extends __BaseException {
    readonly name: "EntityAlreadyExistsException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<EntityAlreadyExistsException, __BaseException>);
}
/**
 * <p>The request was rejected because service-linked roles are protected Amazon Web Services resources. Only
 *       the service that depends on the service-linked role can modify or delete the role on your
 *       behalf. The error message includes the name of the service that depends on this service-linked
 *       role. You must request the change through that service.</p>
 * @public
 */
export declare class UnmodifiableEntityException extends __BaseException {
    readonly name: "UnmodifiableEntityException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<UnmodifiableEntityException, __BaseException>);
}
/**
 * <p>The request failed because Amazon Web Services service role policies can only be attached to the
 *       service-linked role for that service.</p>
 * @public
 */
export declare class PolicyNotAttachableException extends __BaseException {
    readonly name: "PolicyNotAttachableException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<PolicyNotAttachableException, __BaseException>);
}
/**
 * <p>The request was rejected because it referenced an entity that is temporarily unmodifiable,
 *       such as a user name that was deleted and then recreated. The error indicates that the request
 *       is likely to succeed if you try again after waiting several minutes. The error message
 *       describes the entity.</p>
 * @public
 */
export declare class EntityTemporarilyUnmodifiableException extends __BaseException {
    readonly name: "EntityTemporarilyUnmodifiableException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<EntityTemporarilyUnmodifiableException, __BaseException>);
}
/**
 * <p>The request was rejected because the type of user for the transaction was
 *       incorrect.</p>
 * @public
 */
export declare class InvalidUserTypeException extends __BaseException {
    readonly name: "InvalidUserTypeException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidUserTypeException, __BaseException>);
}
/**
 * <p>The request was rejected because the provided password did not meet the requirements
 *       imposed by the account password policy.</p>
 * @public
 */
export declare class PasswordPolicyViolationException extends __BaseException {
    readonly name: "PasswordPolicyViolationException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<PasswordPolicyViolationException, __BaseException>);
}
/**
 * <p>The request failed because IAM cannot connect to the OpenID Connect identity provider
 *       URL.</p>
 * @public
 */
export declare class OpenIdIdpCommunicationErrorException extends __BaseException {
    readonly name: "OpenIdIdpCommunicationErrorException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<OpenIdIdpCommunicationErrorException, __BaseException>);
}
/**
 * <p>The request was rejected because the policy document was malformed. The error message
 *       describes the specific error.</p>
 * @public
 */
export declare class MalformedPolicyDocumentException extends __BaseException {
    readonly name: "MalformedPolicyDocumentException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<MalformedPolicyDocumentException, __BaseException>);
}
/**
 * <p>The specified service does not support service-specific credentials.</p>
 * @public
 */
export declare class ServiceNotSupportedException extends __BaseException {
    readonly name: "ServiceNotSupportedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceNotSupportedException, __BaseException>);
}
/**
 * <p>The request was rejected because it attempted to delete a resource that has attached
 *       subordinate entities. The error message describes these entities.</p>
 * @public
 */
export declare class DeleteConflictException extends __BaseException {
    readonly name: "DeleteConflictException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<DeleteConflictException, __BaseException>);
}
/**
 * <p>The request was rejected because no organization is associated with your account.</p>
 * @public
 */
export declare class OrganizationNotFoundException extends __BaseException {
    readonly name: "OrganizationNotFoundException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<OrganizationNotFoundException, __BaseException>);
}
/**
 * <p>The request was rejected because your organization does not have All features enabled. For
 *       more information, see <a href="https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#feature-set">Available feature sets</a> in the <i>Organizations User
 *       Guide</i>.</p>
 * @public
 */
export declare class OrganizationNotInAllFeaturesModeException extends __BaseException {
    readonly name: "OrganizationNotInAllFeaturesModeException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<OrganizationNotInAllFeaturesModeException, __BaseException>);
}
/**
 * <p>The request was rejected because trusted access is not enabled for IAM in Organizations. For details, see IAM and Organizations in the <i>Organizations User Guide</i>.</p>
 * @public
 */
export declare class ServiceAccessNotEnabledException extends __BaseException {
    readonly name: "ServiceAccessNotEnabledException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceAccessNotEnabledException, __BaseException>);
}
/**
 * <p>The request failed because outbound identity federation is already disabled for your Amazon Web Services account. You cannot disable the feature multiple times</p>
 * @public
 */
export declare class FeatureDisabledException extends __BaseException {
    readonly name: "FeatureDisabledException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<FeatureDisabledException, __BaseException>);
}
/**
 * <p>The request was rejected because the authentication code was not recognized. The error
 *       message describes the specific error.</p>
 * @public
 */
export declare class InvalidAuthenticationCodeException extends __BaseException {
    readonly name: "InvalidAuthenticationCodeException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidAuthenticationCodeException, __BaseException>);
}
/**
 * <p>The request was rejected because the account making the request is not the management
 *       account for the organization.</p>
 * @public
 */
export declare class CallerIsNotManagementAccountException extends __BaseException {
    readonly name: "CallerIsNotManagementAccountException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<CallerIsNotManagementAccountException, __BaseException>);
}
/**
 * <p>The request failed because outbound identity federation is already enabled for your Amazon Web Services account. You
 *       cannot enable the feature multiple times. To fetch the current configuration (including the unique issuer URL), use the <code>GetOutboundWebIdentityFederationInfo</code> operation.</p>
 * @public
 */
export declare class FeatureEnabledException extends __BaseException {
    readonly name: "FeatureEnabledException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<FeatureEnabledException, __BaseException>);
}
/**
 * <p>The request failed because the maximum number of concurrent requests for this account are
 *       already running.</p>
 * @public
 */
export declare class ReportGenerationLimitExceededException extends __BaseException {
    readonly name: "ReportGenerationLimitExceededException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ReportGenerationLimitExceededException, __BaseException>);
}
/**
 * <p>The request was rejected because the most recent credential report has expired. To
 *       generate a new credential report, use <a href="https://docs.aws.amazon.com/IAM/latest/APIReference/API_GenerateCredentialReport.html">GenerateCredentialReport</a>. For more information about credential report expiration,
 *       see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/credential-reports.html">Getting
 *         credential reports</a> in the <i>IAM User Guide</i>.</p>
 * @public
 */
export declare class CredentialReportExpiredException extends __BaseException {
    readonly name: "CredentialReportExpiredException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<CredentialReportExpiredException, __BaseException>);
}
/**
 * <p>The request was rejected because the credential report does not exist. To generate a
 *       credential report, use <a href="https://docs.aws.amazon.com/IAM/latest/APIReference/API_GenerateCredentialReport.html">GenerateCredentialReport</a>.</p>
 * @public
 */
export declare class CredentialReportNotPresentException extends __BaseException {
    readonly name: "CredentialReportNotPresentException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<CredentialReportNotPresentException, __BaseException>);
}
/**
 * <p>The request was rejected because the credential report is still being generated.</p>
 * @public
 */
export declare class CredentialReportNotReadyException extends __BaseException {
    readonly name: "CredentialReportNotReadyException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<CredentialReportNotReadyException, __BaseException>);
}
/**
 * <p>The request was rejected because the public key encoding format is unsupported or
 *       unrecognized.</p>
 * @public
 */
export declare class UnrecognizedPublicKeyEncodingException extends __BaseException {
    readonly name: "UnrecognizedPublicKeyEncodingException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<UnrecognizedPublicKeyEncodingException, __BaseException>);
}
/**
 * <p>The request failed because a provided policy could not be successfully evaluated. An
 *       additional detailed message indicates the source of the failure.</p>
 * @public
 */
export declare class PolicyEvaluationException extends __BaseException {
    readonly name: "PolicyEvaluationException";
    readonly $fault: "server";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<PolicyEvaluationException, __BaseException>);
}
/**
 * <p>The request was rejected because the public key certificate and the private key do not
 *       match.</p>
 * @public
 */
export declare class KeyPairMismatchException extends __BaseException {
    readonly name: "KeyPairMismatchException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<KeyPairMismatchException, __BaseException>);
}
/**
 * <p>The request was rejected because the certificate was malformed or expired. The error
 *       message describes the specific error.</p>
 * @public
 */
export declare class MalformedCertificateException extends __BaseException {
    readonly name: "MalformedCertificateException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<MalformedCertificateException, __BaseException>);
}
/**
 * <p>The request was rejected because the same certificate is associated with an IAM user in
 *       the account.</p>
 * @public
 */
export declare class DuplicateCertificateException extends __BaseException {
    readonly name: "DuplicateCertificateException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<DuplicateCertificateException, __BaseException>);
}
/**
 * <p>The request was rejected because the certificate is invalid.</p>
 * @public
 */
export declare class InvalidCertificateException extends __BaseException {
    readonly name: "InvalidCertificateException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidCertificateException, __BaseException>);
}
/**
 * <p>The request was rejected because the SSH public key is already associated with the
 *       specified IAM user.</p>
 * @public
 */
export declare class DuplicateSSHPublicKeyException extends __BaseException {
    readonly name: "DuplicateSSHPublicKeyException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<DuplicateSSHPublicKeyException, __BaseException>);
}
/**
 * <p>The request was rejected because the public key is malformed or otherwise invalid.</p>
 * @public
 */
export declare class InvalidPublicKeyException extends __BaseException {
    readonly name: "InvalidPublicKeyException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidPublicKeyException, __BaseException>);
}
