import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ResetServiceSpecificCredential$ } from "../schemas/schemas_0";
export { $Command };
export class ResetServiceSpecificCredentialCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "ResetServiceSpecificCredential", {})
    .n("IAMClient", "ResetServiceSpecificCredentialCommand")
    .sc(ResetServiceSpecificCredential$)
    .build() {
}
