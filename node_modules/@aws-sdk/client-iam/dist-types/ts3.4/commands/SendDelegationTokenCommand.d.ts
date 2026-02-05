import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import { SendDelegationTokenRequest } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface SendDelegationTokenCommandInput
  extends SendDelegationTokenRequest {}
export interface SendDelegationTokenCommandOutput extends __MetadataBearer {}
declare const SendDelegationTokenCommand_base: {
  new (
    input: SendDelegationTokenCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SendDelegationTokenCommandInput,
    SendDelegationTokenCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: SendDelegationTokenCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SendDelegationTokenCommandInput,
    SendDelegationTokenCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class SendDelegationTokenCommand extends SendDelegationTokenCommand_base {
  protected static __types: {
    api: {
      input: SendDelegationTokenRequest;
      output: {};
    };
    sdk: {
      input: SendDelegationTokenCommandInput;
      output: SendDelegationTokenCommandOutput;
    };
  };
}
