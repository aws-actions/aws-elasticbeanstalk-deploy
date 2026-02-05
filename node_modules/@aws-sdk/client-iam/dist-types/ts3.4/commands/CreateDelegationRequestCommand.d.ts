import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import {
  CreateDelegationRequestRequest,
  CreateDelegationRequestResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface CreateDelegationRequestCommandInput
  extends CreateDelegationRequestRequest {}
export interface CreateDelegationRequestCommandOutput
  extends CreateDelegationRequestResponse,
    __MetadataBearer {}
declare const CreateDelegationRequestCommand_base: {
  new (
    input: CreateDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateDelegationRequestCommandInput,
    CreateDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateDelegationRequestCommandInput,
    CreateDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateDelegationRequestCommand extends CreateDelegationRequestCommand_base {
  protected static __types: {
    api: {
      input: CreateDelegationRequestRequest;
      output: CreateDelegationRequestResponse;
    };
    sdk: {
      input: CreateDelegationRequestCommandInput;
      output: CreateDelegationRequestCommandOutput;
    };
  };
}
