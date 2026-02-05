import { IAMServiceException as __BaseException } from "./IAMServiceException";
export class ConcurrentModificationException extends __BaseException {
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
export class NoSuchEntityException extends __BaseException {
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
export class ServiceFailureException extends __BaseException {
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
export class AccountNotManagementOrDelegatedAdministratorException extends __BaseException {
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
export class InvalidInputException extends __BaseException {
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
export class LimitExceededException extends __BaseException {
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
export class EntityAlreadyExistsException extends __BaseException {
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
export class UnmodifiableEntityException extends __BaseException {
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
export class PolicyNotAttachableException extends __BaseException {
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
export class EntityTemporarilyUnmodifiableException extends __BaseException {
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
export class InvalidUserTypeException extends __BaseException {
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
export class PasswordPolicyViolationException extends __BaseException {
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
export class OpenIdIdpCommunicationErrorException extends __BaseException {
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
export class MalformedPolicyDocumentException extends __BaseException {
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
export class ServiceNotSupportedException extends __BaseException {
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
export class DeleteConflictException extends __BaseException {
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
export class OrganizationNotFoundException extends __BaseException {
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
export class OrganizationNotInAllFeaturesModeException extends __BaseException {
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
export class ServiceAccessNotEnabledException extends __BaseException {
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
export class FeatureDisabledException extends __BaseException {
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
export class InvalidAuthenticationCodeException extends __BaseException {
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
export class CallerIsNotManagementAccountException extends __BaseException {
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
export class FeatureEnabledException extends __BaseException {
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
export class ReportGenerationLimitExceededException extends __BaseException {
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
export class CredentialReportExpiredException extends __BaseException {
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
export class CredentialReportNotPresentException extends __BaseException {
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
export class CredentialReportNotReadyException extends __BaseException {
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
export class UnrecognizedPublicKeyEncodingException extends __BaseException {
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
export class PolicyEvaluationException extends __BaseException {
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
export class KeyPairMismatchException extends __BaseException {
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
export class MalformedCertificateException extends __BaseException {
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
export class DuplicateCertificateException extends __BaseException {
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
export class InvalidCertificateException extends __BaseException {
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
export class DuplicateSSHPublicKeyException extends __BaseException {
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
export class InvalidPublicKeyException extends __BaseException {
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
