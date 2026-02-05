import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import { EnableOutboundWebIdentityFederationResponse } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface EnableOutboundWebIdentityFederationCommandInput {}
export interface EnableOutboundWebIdentityFederationCommandOutput
  extends EnableOutboundWebIdentityFederationResponse,
    __MetadataBearer {}
declare const EnableOutboundWebIdentityFederationCommand_base: {
  new (
    input: EnableOutboundWebIdentityFederationCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    EnableOutboundWebIdentityFederationCommandInput,
    EnableOutboundWebIdentityFederationCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [EnableOutboundWebIdentityFederationCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    EnableOutboundWebIdentityFederationCommandInput,
    EnableOutboundWebIdentityFederationCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class EnableOutboundWebIdentityFederationCommand extends EnableOutboundWebIdentityFederationCommand_base {
  protected static __types: {
    api: {
      input: {};
      output: EnableOutboundWebIdentityFederationResponse;
    };
    sdk: {
      input: EnableOutboundWebIdentityFederationCommandInput;
      output: EnableOutboundWebIdentityFederationCommandOutput;
    };
  };
}
