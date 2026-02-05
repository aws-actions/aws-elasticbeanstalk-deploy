import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import { UpdateDelegationRequestRequest } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface UpdateDelegationRequestCommandInput
  extends UpdateDelegationRequestRequest {}
export interface UpdateDelegationRequestCommandOutput
  extends __MetadataBearer {}
declare const UpdateDelegationRequestCommand_base: {
  new (
    input: UpdateDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UpdateDelegationRequestCommandInput,
    UpdateDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: UpdateDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UpdateDelegationRequestCommandInput,
    UpdateDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class UpdateDelegationRequestCommand extends UpdateDelegationRequestCommand_base {
  protected static __types: {
    api: {
      input: UpdateDelegationRequestRequest;
      output: {};
    };
    sdk: {
      input: UpdateDelegationRequestCommandInput;
      output: UpdateDelegationRequestCommandOutput;
    };
  };
}
