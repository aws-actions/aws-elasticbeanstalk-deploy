import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutGroupPolicy$ } from "../schemas/schemas_0";
export { $Command };
export class PutGroupPolicyCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "PutGroupPolicy", {})
    .n("IAMClient", "PutGroupPolicyCommand")
    .sc(PutGroupPolicy$)
    .build() {
}
