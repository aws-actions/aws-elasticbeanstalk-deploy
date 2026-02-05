import { AssertionEncryptionModeType, StatusType } from "./enums";
import {
  Role,
  ServerCertificateMetadata,
  SigningCertificate,
  SSHPublicKey,
  Tag,
} from "./models_0";
export interface UpdateOpenIDConnectProviderThumbprintRequest {
  OpenIDConnectProviderArn: string | undefined;
  ThumbprintList: string[] | undefined;
}
export interface UpdateRoleRequest {
  RoleName: string | undefined;
  Description?: string | undefined;
  MaxSessionDuration?: number | undefined;
}
export interface UpdateRoleResponse {}
export interface UpdateRoleDescriptionRequest {
  RoleName: string | undefined;
  Description: string | undefined;
}
export interface UpdateRoleDescriptionResponse {
  Role?: Role | undefined;
}
export interface UpdateSAMLProviderRequest {
  SAMLMetadataDocument?: string | undefined;
  SAMLProviderArn: string | undefined;
  AssertionEncryptionMode?: AssertionEncryptionModeType | undefined;
  AddPrivateKey?: string | undefined;
  RemovePrivateKey?: string | undefined;
}
export interface UpdateSAMLProviderResponse {
  SAMLProviderArn?: string | undefined;
}
export interface UpdateServerCertificateRequest {
  ServerCertificateName: string | undefined;
  NewPath?: string | undefined;
  NewServerCertificateName?: string | undefined;
}
export interface UpdateServiceSpecificCredentialRequest {
  UserName?: string | undefined;
  ServiceSpecificCredentialId: string | undefined;
  Status: StatusType | undefined;
}
export interface UpdateSigningCertificateRequest {
  UserName?: string | undefined;
  CertificateId: string | undefined;
  Status: StatusType | undefined;
}
export interface UpdateSSHPublicKeyRequest {
  UserName: string | undefined;
  SSHPublicKeyId: string | undefined;
  Status: StatusType | undefined;
}
export interface UpdateUserRequest {
  UserName: string | undefined;
  NewPath?: string | undefined;
  NewUserName?: string | undefined;
}
export interface UploadServerCertificateRequest {
  Path?: string | undefined;
  ServerCertificateName: string | undefined;
  CertificateBody: string | undefined;
  PrivateKey: string | undefined;
  CertificateChain?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface UploadServerCertificateResponse {
  ServerCertificateMetadata?: ServerCertificateMetadata | undefined;
  Tags?: Tag[] | undefined;
}
export interface UploadSigningCertificateRequest {
  UserName?: string | undefined;
  CertificateBody: string | undefined;
}
export interface UploadSigningCertificateResponse {
  Certificate: SigningCertificate | undefined;
}
export interface UploadSSHPublicKeyRequest {
  UserName: string | undefined;
  SSHPublicKeyBody: string | undefined;
}
export interface UploadSSHPublicKeyResponse {
  SSHPublicKey?: SSHPublicKey | undefined;
}
