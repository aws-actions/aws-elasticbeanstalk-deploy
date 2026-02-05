import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateUser$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateUserCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "UpdateUser", {})
    .n("IAMClient", "UpdateUserCommand")
    .sc(UpdateUser$)
    .build() {
}
