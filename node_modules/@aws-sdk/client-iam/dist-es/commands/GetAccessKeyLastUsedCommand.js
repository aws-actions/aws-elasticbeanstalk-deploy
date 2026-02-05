import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetAccessKeyLastUsed$ } from "../schemas/schemas_0";
export { $Command };
export class GetAccessKeyLastUsedCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "GetAccessKeyLastUsed", {})
    .n("IAMClient", "GetAccessKeyLastUsedCommand")
    .sc(GetAccessKeyLastUsed$)
    .build() {
}
