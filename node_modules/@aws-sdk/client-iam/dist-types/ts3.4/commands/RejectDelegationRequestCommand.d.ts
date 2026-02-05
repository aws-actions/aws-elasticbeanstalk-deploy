import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import { RejectDelegationRequestRequest } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface RejectDelegationRequestCommandInput
  extends RejectDelegationRequestRequest {}
export interface RejectDelegationRequestCommandOutput
  extends __MetadataBearer {}
declare const RejectDelegationRequestCommand_base: {
  new (
    input: RejectDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RejectDelegationRequestCommandInput,
    RejectDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: RejectDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RejectDelegationRequestCommandInput,
    RejectDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class RejectDelegationRequestCommand extends RejectDelegationRequestCommand_base {
  protected static __types: {
    api: {
      input: RejectDelegationRequestRequest;
      output: {};
    };
    sdk: {
      input: RejectDelegationRequestCommandInput;
      output: RejectDelegationRequestCommandOutput;
    };
  };
}
