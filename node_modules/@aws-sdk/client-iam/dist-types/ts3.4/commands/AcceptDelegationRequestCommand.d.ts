import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import { AcceptDelegationRequestRequest } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface AcceptDelegationRequestCommandInput
  extends AcceptDelegationRequestRequest {}
export interface AcceptDelegationRequestCommandOutput
  extends __MetadataBearer {}
declare const AcceptDelegationRequestCommand_base: {
  new (
    input: AcceptDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    AcceptDelegationRequestCommandInput,
    AcceptDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: AcceptDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    AcceptDelegationRequestCommandInput,
    AcceptDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class AcceptDelegationRequestCommand extends AcceptDelegationRequestCommand_base {
  protected static __types: {
    api: {
      input: AcceptDelegationRequestRequest;
      output: {};
    };
    sdk: {
      input: AcceptDelegationRequestCommandInput;
      output: AcceptDelegationRequestCommandOutput;
    };
  };
}
