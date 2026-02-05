import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import {
  ListDelegationRequestsRequest,
  ListDelegationRequestsResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface ListDelegationRequestsCommandInput
  extends ListDelegationRequestsRequest {}
export interface ListDelegationRequestsCommandOutput
  extends ListDelegationRequestsResponse,
    __MetadataBearer {}
declare const ListDelegationRequestsCommand_base: {
  new (
    input: ListDelegationRequestsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDelegationRequestsCommandInput,
    ListDelegationRequestsCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListDelegationRequestsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListDelegationRequestsCommandInput,
    ListDelegationRequestsCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListDelegationRequestsCommand extends ListDelegationRequestsCommand_base {
  protected static __types: {
    api: {
      input: ListDelegationRequestsRequest;
      output: ListDelegationRequestsResponse;
    };
    sdk: {
      input: ListDelegationRequestsCommandInput;
      output: ListDelegationRequestsCommandOutput;
    };
  };
}
