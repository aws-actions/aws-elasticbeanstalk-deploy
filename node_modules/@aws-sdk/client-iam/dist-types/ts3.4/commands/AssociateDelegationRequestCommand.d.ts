import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import { AssociateDelegationRequestRequest } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface AssociateDelegationRequestCommandInput
  extends AssociateDelegationRequestRequest {}
export interface AssociateDelegationRequestCommandOutput
  extends __MetadataBearer {}
declare const AssociateDelegationRequestCommand_base: {
  new (
    input: AssociateDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    AssociateDelegationRequestCommandInput,
    AssociateDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: AssociateDelegationRequestCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    AssociateDelegationRequestCommandInput,
    AssociateDelegationRequestCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class AssociateDelegationRequestCommand extends AssociateDelegationRequestCommand_base {
  protected static __types: {
    api: {
      input: AssociateDelegationRequestRequest;
      output: {};
    };
    sdk: {
      input: AssociateDelegationRequestCommandInput;
      output: AssociateDelegationRequestCommandOutput;
    };
  };
}
