import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { IAMServiceException as __BaseException } from "./IAMServiceException";
export declare class ConcurrentModificationException extends __BaseException {
  readonly name: "ConcurrentModificationException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      ConcurrentModificationException,
      __BaseException
    >
  );
}
export declare class NoSuchEntityException extends __BaseException {
  readonly name: "NoSuchEntityException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<NoSuchEntityException, __BaseException>
  );
}
export declare class ServiceFailureException extends __BaseException {
  readonly name: "ServiceFailureException";
  readonly $fault: "server";
  constructor(
    opts: __ExceptionOptionType<ServiceFailureException, __BaseException>
  );
}
export declare class AccountNotManagementOrDelegatedAdministratorException extends __BaseException {
  readonly name: "AccountNotManagementOrDelegatedAdministratorException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<
      AccountNotManagementOrDelegatedAdministratorException,
      __BaseException
    >
  );
}
export declare class InvalidInputException extends __BaseException {
  readonly name: "InvalidInputException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidInputException, __BaseException>
  );
}
export declare class LimitExceededException extends __BaseException {
  readonly name: "LimitExceededException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<LimitExceededException, __BaseException>
  );
}
export declare class EntityAlreadyExistsException extends __BaseException {
  readonly name: "EntityAlreadyExistsException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<EntityAlreadyExistsException, __BaseException>
  );
}
export declare class UnmodifiableEntityException extends __BaseException {
  readonly name: "UnmodifiableEntityException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<UnmodifiableEntityException, __BaseException>
  );
}
export declare class PolicyNotAttachableException extends __BaseException {
  readonly name: "PolicyNotAttachableException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<PolicyNotAttachableException, __BaseException>
  );
}
export declare class EntityTemporarilyUnmodifiableException extends __BaseException {
  readonly name: "EntityTemporarilyUnmodifiableException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      EntityTemporarilyUnmodifiableException,
      __BaseException
    >
  );
}
export declare class InvalidUserTypeException extends __BaseException {
  readonly name: "InvalidUserTypeException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidUserTypeException, __BaseException>
  );
}
export declare class PasswordPolicyViolationException extends __BaseException {
  readonly name: "PasswordPolicyViolationException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      PasswordPolicyViolationException,
      __BaseException
    >
  );
}
export declare class OpenIdIdpCommunicationErrorException extends __BaseException {
  readonly name: "OpenIdIdpCommunicationErrorException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      OpenIdIdpCommunicationErrorException,
      __BaseException
    >
  );
}
export declare class MalformedPolicyDocumentException extends __BaseException {
  readonly name: "MalformedPolicyDocumentException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      MalformedPolicyDocumentException,
      __BaseException
    >
  );
}
export declare class ServiceNotSupportedException extends __BaseException {
  readonly name: "ServiceNotSupportedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ServiceNotSupportedException, __BaseException>
  );
}
export declare class DeleteConflictException extends __BaseException {
  readonly name: "DeleteConflictException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<DeleteConflictException, __BaseException>
  );
}
export declare class OrganizationNotFoundException extends __BaseException {
  readonly name: "OrganizationNotFoundException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<OrganizationNotFoundException, __BaseException>
  );
}
export declare class OrganizationNotInAllFeaturesModeException extends __BaseException {
  readonly name: "OrganizationNotInAllFeaturesModeException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<
      OrganizationNotInAllFeaturesModeException,
      __BaseException
    >
  );
}
export declare class ServiceAccessNotEnabledException extends __BaseException {
  readonly name: "ServiceAccessNotEnabledException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<
      ServiceAccessNotEnabledException,
      __BaseException
    >
  );
}
export declare class FeatureDisabledException extends __BaseException {
  readonly name: "FeatureDisabledException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<FeatureDisabledException, __BaseException>
  );
}
export declare class InvalidAuthenticationCodeException extends __BaseException {
  readonly name: "InvalidAuthenticationCodeException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      InvalidAuthenticationCodeException,
      __BaseException
    >
  );
}
export declare class CallerIsNotManagementAccountException extends __BaseException {
  readonly name: "CallerIsNotManagementAccountException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<
      CallerIsNotManagementAccountException,
      __BaseException
    >
  );
}
export declare class FeatureEnabledException extends __BaseException {
  readonly name: "FeatureEnabledException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<FeatureEnabledException, __BaseException>
  );
}
export declare class ReportGenerationLimitExceededException extends __BaseException {
  readonly name: "ReportGenerationLimitExceededException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      ReportGenerationLimitExceededException,
      __BaseException
    >
  );
}
export declare class CredentialReportExpiredException extends __BaseException {
  readonly name: "CredentialReportExpiredException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      CredentialReportExpiredException,
      __BaseException
    >
  );
}
export declare class CredentialReportNotPresentException extends __BaseException {
  readonly name: "CredentialReportNotPresentException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      CredentialReportNotPresentException,
      __BaseException
    >
  );
}
export declare class CredentialReportNotReadyException extends __BaseException {
  readonly name: "CredentialReportNotReadyException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      CredentialReportNotReadyException,
      __BaseException
    >
  );
}
export declare class UnrecognizedPublicKeyEncodingException extends __BaseException {
  readonly name: "UnrecognizedPublicKeyEncodingException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      UnrecognizedPublicKeyEncodingException,
      __BaseException
    >
  );
}
export declare class PolicyEvaluationException extends __BaseException {
  readonly name: "PolicyEvaluationException";
  readonly $fault: "server";
  constructor(
    opts: __ExceptionOptionType<PolicyEvaluationException, __BaseException>
  );
}
export declare class KeyPairMismatchException extends __BaseException {
  readonly name: "KeyPairMismatchException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<KeyPairMismatchException, __BaseException>
  );
}
export declare class MalformedCertificateException extends __BaseException {
  readonly name: "MalformedCertificateException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<MalformedCertificateException, __BaseException>
  );
}
export declare class DuplicateCertificateException extends __BaseException {
  readonly name: "DuplicateCertificateException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<DuplicateCertificateException, __BaseException>
  );
}
export declare class InvalidCertificateException extends __BaseException {
  readonly name: "InvalidCertificateException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidCertificateException, __BaseException>
  );
}
export declare class DuplicateSSHPublicKeyException extends __BaseException {
  readonly name: "DuplicateSSHPublicKeyException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<DuplicateSSHPublicKeyException, __BaseException>
  );
}
export declare class InvalidPublicKeyException extends __BaseException {
  readonly name: "InvalidPublicKeyException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidPublicKeyException, __BaseException>
  );
}
