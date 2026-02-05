import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreatePolicyVersion$ } from "../schemas/schemas_0";
export { $Command };
export class CreatePolicyVersionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "CreatePolicyVersion", {})
    .n("IAMClient", "CreatePolicyVersionCommand")
    .sc(CreatePolicyVersion$)
    .build() {
}
