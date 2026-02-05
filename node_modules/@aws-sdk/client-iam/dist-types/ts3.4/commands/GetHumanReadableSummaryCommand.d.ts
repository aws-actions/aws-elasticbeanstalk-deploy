import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  IAMClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../IAMClient";
import {
  GetHumanReadableSummaryRequest,
  GetHumanReadableSummaryResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface GetHumanReadableSummaryCommandInput
  extends GetHumanReadableSummaryRequest {}
export interface GetHumanReadableSummaryCommandOutput
  extends GetHumanReadableSummaryResponse,
    __MetadataBearer {}
declare const GetHumanReadableSummaryCommand_base: {
  new (
    input: GetHumanReadableSummaryCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetHumanReadableSummaryCommandInput,
    GetHumanReadableSummaryCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetHumanReadableSummaryCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetHumanReadableSummaryCommandInput,
    GetHumanReadableSummaryCommandOutput,
    IAMClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetHumanReadableSummaryCommand extends GetHumanReadableSummaryCommand_base {
  protected static __types: {
    api: {
      input: GetHumanReadableSummaryRequest;
      output: GetHumanReadableSummaryResponse;
    };
    sdk: {
      input: GetHumanReadableSummaryCommandInput;
      output: GetHumanReadableSummaryCommandOutput;
    };
  };
}
