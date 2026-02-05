import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import { GetOutboundWebIdentityFederationInfoResponse } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface GetOutboundWebIdentityFederationInfoCommandInput {}
export interface GetOutboundWebIdentityFederationInfoCommandOutput
  extends GetOutboundWebIdentityFederationInfoResponse,
    __MetadataBearer {}
declare const GetOutboundWebIdentityFederationInfoCommand_base: {
  new (
    input: GetOutboundWebIdentityFederationInfoCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetOutboundWebIdentityFederationInfoCommandInput,
    GetOutboundWebIdentityFederationInfoCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [GetOutboundWebIdentityFederationInfoCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    GetOutboundWebIdentityFederationInfoCommandInput,
    GetOutboundWebIdentityFederationInfoCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetOutboundWebIdentityFederationInfoCommand extends GetOutboundWebIdentityFederationInfoCommand_base {
  protected static __types: {
    api: {
      input: {};
      output: GetOutboundWebIdentityFederationInfoResponse;
    };
    sdk: {
      input: GetOutboundWebIdentityFederationInfoCommandInput;
      output: GetOutboundWebIdentityFederationInfoCommandOutput;
    };
  };
}
