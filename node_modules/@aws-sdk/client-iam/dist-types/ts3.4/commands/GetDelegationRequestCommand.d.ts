import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import {
  GetDelegationRequestRequest,
  GetDelegationRequestResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface GetDelegationRequestCommandInput
  extends GetDelegationRequestRequest {}
export interface GetDelegationRequestCommandOutput
  extends GetDelegationRequestResponse,
    __MetadataBearer {}
declare const GetDelegationRequestCommand_base: {
  new (
    input: GetDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetDelegationRequestCommandInput,
    GetDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetDelegationRequestCommandInput,
    GetDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetDelegationRequestCommand extends GetDelegationRequestCommand_base {
  protected static __types: {
    api: {
      input: GetDelegationRequestRequest;
      output: GetDelegationRequestResponse;
    };
    sdk: {
      input: GetDelegationRequestCommandInput;
      output: GetDelegationRequestCommandOutput;
    };
  };
}
