import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
export { __MetadataBearer };
export { $Command };
export interface DisableOutboundWebIdentityFederationCommandInput {}
export interface DisableOutboundWebIdentityFederationCommandOutput
  extends __MetadataBearer {}
declare const DisableOutboundWebIdentityFederationCommand_base: {
  new (
    input: DisableOutboundWebIdentityFederationCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DisableOutboundWebIdentityFederationCommandInput,
    DisableOutboundWebIdentityFederationCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [DisableOutboundWebIdentityFederationCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    DisableOutboundWebIdentityFederationCommandInput,
    DisableOutboundWebIdentityFederationCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class DisableOutboundWebIdentityFederationCommand extends DisableOutboundWebIdentityFederationCommand_base {
  protected static __types: {
    api: {
      input: {};
      output: {};
    };
    sdk: {
      input: DisableOutboundWebIdentityFederationCommandInput;
      output: DisableOutboundWebIdentityFederationCommandOutput;
    };
  };
}
