import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetCredentialReport$ } from "../schemas/schemas_0";
export { $Command };
export class GetCredentialReportCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetCredentialReport", {})
    .n("IAMClient", "GetCredentialReportCommand")
    .sc(GetCredentialReport$)
    .build() {
}
