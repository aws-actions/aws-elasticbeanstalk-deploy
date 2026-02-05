import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { AddUserToGroup$ } from "../schemas/schemas_0";
export { $Command };
export class AddUserToGroupCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSIdentityManagementV20100508", "AddUserToGroup", {})
    .n("IAMClient", "AddUserToGroupCommand")
    .sc(AddUserToGroup$)
    .build() {
}
