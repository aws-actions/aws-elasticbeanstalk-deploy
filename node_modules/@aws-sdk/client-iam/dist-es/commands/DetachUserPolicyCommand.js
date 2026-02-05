import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DetachUserPolicy$ } from "../schemas/schemas_0";
export { $Command };
export class DetachUserPolicyCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "DetachUserPolicy", {})
    .n("IAMClient", "DetachUserPolicyCommand")
    .sc(DetachUserPolicy$)
    .build() {
}
